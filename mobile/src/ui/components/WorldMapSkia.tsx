import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import {
  Canvas,
  Group,
  Path,
  Skia,
  Shadow
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useDerivedValue,
} from 'react-native-reanimated';
import { useGameState } from '../GameProvider';
import { DiplomaticRelation } from '../../core/models/enums';

interface WorldMapSkiaProps {
  onRegionPress: (regionId: string) => void;
  selectedRegionId: string | null;
  viewMode?: 'owner' | 'religion' | 'economy' | 'military';
}

import { interpolateColor, applyFogOfWar, calculateVisibility } from './map/map-helpers';

// ─── Projeção Geográfica ──────────────────────────────────────────────────
// O JSON original contém center.x (Longitude -180 a 180) e center.y (Latitude -90 a 90)
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 1500;
const LON_MIN = -180;
const LON_MAX = 180;
const LAT_MAX = 85;
const LAT_MIN = -65;

const SCALE_X = MAP_WIDTH / (LON_MAX - LON_MIN);
const SCALE_Y = MAP_HEIGHT / (LAT_MAX - LAT_MIN);

function project(lon: number, lat: number) {
  const x = (lon - LON_MIN) * SCALE_X;
  const y = (LAT_MAX - lat) * SCALE_Y; // Inverte o Y (Lat 85 fica no topo 0)
  return { x, y };
}

// O tamanho de cada território (Círculo ou Hex) projetado.
const TERRITORY_RADIUS = 6.5; 

// Cria o path de um hexágono centralizado
function createHexPath(cx: number, cy: number, size: number) {
  const path = Skia.Path.Make();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.close();
  return path;
}


export default function WorldMapSkia({ onRegionPress, selectedRegionId, viewMode = 'owner' }: WorldMapSkiaProps) {
  const { gameState, staticWorldData, playerKingdomId, session } = useGameState();
  const { width: screenW, height: screenH } = Dimensions.get('window');

  // Gestos (Pan e Zoom)
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const [isReady, setIsReady] = useState(false);

  // Computa a Câmera Inicial baseada no Jogador e os Paths
  const { pathsGroupedByColor, initialTranslateX, initialTranslateY, waterPaths, highlightPath } = useMemo(() => {
    if (!gameState || !staticWorldData) {
      return { pathsGroupedByColor: {}, initialTranslateX: 0, initialTranslateY: 0, waterPaths: Skia.Path.Make(), highlightPath: null };
    }

    const playerKingdom = gameState.kingdoms[playerKingdomId];
    const playerRelations = playerKingdom?.diplomacy?.relations ?? {};
    const fogDisabled = session?.fogOfWarDisabled;

    // 1. Fog of War Visibility Pre-calculation O(N)
    const visibleRegions = calculateVisibility(
      staticWorldData.definitions,
      gameState.world.regions,
      playerKingdomId,
      playerRelations
    );

    // 2. Military mode: pre-calculate war fronts and region manpower
    const warFronts = new Set<string>();
    if (gameState.wars) {
      Object.values(gameState.wars).forEach(war => {
        if (war.fronts) {
          war.fronts.forEach(front => {
            warFronts.add(front.regionId);
          });
        }
      });
    }

    const regionManpower: Record<string, number> = {};
    let maxManpower = 0;
    Object.values(gameState.kingdoms).forEach(kingdom => {
      if (kingdom.military?.armies) {
        kingdom.military.armies.forEach(army => {
          const rId = army.stationedRegionId;
          if (rId) {
            const mp = army.manpower ?? 0;
            regionManpower[rId] = (regionManpower[rId] ?? 0) + mp;
            if (regionManpower[rId] > maxManpower) {
              maxManpower = regionManpower[rId];
            }
          }
        });
      }
    });

    const groups: Record<string, ReturnType<typeof Skia.Path.Make>> = {};
    const getGroupPath = (color: string) => {
      if (!groups[color]) groups[color] = Skia.Path.Make();
      return groups[color];
    };

    let pX = 0, pY = 0, pCount = 0;
    const water = Skia.Path.Make();
    let highlight = null;

    Object.keys(staticWorldData.definitions).forEach(regionId => {
      const regionDef = staticWorldData.definitions[regionId];
      if (!regionDef || !regionDef.center) return;

      const { x, y } = project(regionDef.center.x, regionDef.center.y);
      const regionState = gameState.world.regions[regionId];
      const ownerId = regionState?.ownerId ?? '';
      
      const isPlayer = ownerId === playerKingdomId;
      if (isPlayer) {
        pX += x; pY += y; pCount++;
      }

      // Adiciona geometria da região
      const hex = createHexPath(x, y, TERRITORY_RADIUS);

      if (regionId === selectedRegionId) {
        highlight = createHexPath(x, y, TERRITORY_RADIUS * 1.6);
      }

      if (regionDef.isWater) {
        water.addPath(hex);
        return; // Água não processa cor
      }

      // Define color based on viewMode
      let finalColor = '#151924';

      if (viewMode === 'owner') {
        if (ownerId && ownerId !== 'unclaimed') {
          const ownerKingdom = gameState.kingdoms[ownerId];
          if (ownerKingdom?.color) {
            finalColor = ownerKingdom.color;
          } else if (isPlayer) {
            finalColor = '#E5C05C'; // Ouro Vivo
          } else {
            const relation = playerRelations[ownerId]?.status;
            switch (relation) {
              case DiplomaticRelation.Allied: finalColor = '#2ECC71'; break;
              case DiplomaticRelation.Friendly: finalColor = '#27AE60'; break;
              case DiplomaticRelation.Hostile: finalColor = '#E74C3C'; break;
              case DiplomaticRelation.Truce: finalColor = '#E67E22'; break;
              default: finalColor = '#3A445C'; break; // Outro NPC distante
            }
          }
        }
      } else if (viewMode === 'religion') {
        const dominantFaith = regionState?.dominantFaith;
        if (dominantFaith) {
          const religionDef = gameState.world.religions[dominantFaith];
          if (religionDef?.color) {
            finalColor = religionDef.color;
          }
        }
      } else if (viewMode === 'economy') {
        if (!ownerId || ownerId === 'unclaimed' || ownerId === 'nature') {
          finalColor = '#151924';
        } else {
          const autonomy = regionState?.autonomy ?? 0;
          const unrest = regionState?.unrest ?? 0;
          const devastation = regionState?.devastation ?? 0;
          const assimilation = regionState?.assimilation ?? 1;

          const productivity = (1 - autonomy) * (1 - unrest) * (1 - devastation) * assimilation;
          // Lerp between Dark Steel-Blue (#2A3E5C) and Gold/Yellow (#E5C05C)
          finalColor = interpolateColor('#2A3E5C', '#E5C05C', productivity);
        }
      } else if (viewMode === 'military') {
        let baseColor = '#151924';
        if (ownerId && ownerId !== 'unclaimed') {
          const ownerKingdom = gameState.kingdoms[ownerId];
          if (ownerKingdom?.color) {
            baseColor = ownerKingdom.color;
          } else if (isPlayer) {
            baseColor = '#E5C05C';
          } else {
            const relation = playerRelations[ownerId]?.status;
            switch (relation) {
              case DiplomaticRelation.Allied: baseColor = '#2ECC71'; break;
              case DiplomaticRelation.Friendly: baseColor = '#27AE60'; break;
              case DiplomaticRelation.Hostile: baseColor = '#E74C3C'; break;
              case DiplomaticRelation.Truce: baseColor = '#E67E22'; break;
              default: baseColor = '#3A445C'; break;
            }
          }
        }

        if (warFronts.has(regionId)) {
          finalColor = '#DC143C'; // Contested war fronts in crimson
        } else {
          const mp = regionManpower[regionId] ?? 0;
          if (mp > 0) {
            const ratio = maxManpower > 0 ? mp / maxManpower : 0;
            finalColor = interpolateColor(baseColor, '#FF8C00', Math.min(ratio + 0.2, 1.0));
          } else {
            finalColor = baseColor;
          }
        }
      }

      // 3. Shading Performance (Fog of War)
      const isVisible = fogDisabled || visibleRegions.has(regionId);
      if (!isVisible) {
        finalColor = applyFogOfWar(finalColor);
      }

      getGroupPath(finalColor).addPath(hex);
    });

    // Centraliza câmera no império do jogador
    let initialX = 0;
    let initialY = 0;
    if (pCount > 0) {
      initialX = (screenW / 2) - (pX / pCount);
      initialY = (screenH / 2) - (pY / pCount);
    } else {
      initialX = (screenW / 2) - (MAP_WIDTH / 2);
      initialY = (screenH / 2) - (MAP_HEIGHT / 2);
    }

    return { pathsGroupedByColor: groups, initialTranslateX: initialX, initialTranslateY: initialY, waterPaths: water, highlightPath: highlight };
  }, [gameState, staticWorldData, playerKingdomId, selectedRegionId, screenW, screenH, viewMode, session?.fogOfWarDisabled]);

  React.useEffect(() => {
    if (!isReady && initialTranslateX !== 0) {
      const s = 1.2; 
      const originX = screenW / 2;
      const originY = screenH / 2;
      
      const pX = originX - initialTranslateX; 
      const pY = originY - initialTranslateY;
      
      translateX.value = -(pX - originX) * s;
      translateY.value = -(pY - originY) * s;
      scale.value = s;
      
      setIsReady(true);
    }
  }, [isReady, initialTranslateX, initialTranslateY, screenW, screenH]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const newScale = Math.max(0.3, Math.min(startScale.value * e.scale, 5));
      scale.value = newScale;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const skiaTransform = useDerivedValue(() => {
    const originX = screenW / 2;
    const originY = screenH / 2;

    const scaledWidth = MAP_WIDTH * scale.value;
    // Lógica de Modulo Infinito (Wrap-around seamless)
    let tx = translateX.value % scaledWidth;
    if (tx > 0) tx -= scaledWidth;

    return [
      { translateX: tx + originX },
      { translateY: translateY.value + originY },
      { scale: scale.value },
      { translateX: -originX },
      { translateY: -originY },
    ];
  });

  if (!gameState || Object.keys(pathsGroupedByColor).length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🗺️ Construindo Mapa Global...</Text>
      </View>
    );
  }

  const renderMapContent = () => (
    <Group>
      <Path path={waterPaths} color="#060B14" />
      {Object.entries(pathsGroupedByColor).map(([color, path]) => {
        const isGolden = color === '#E5C05C';
        return (
          <Group key={color}>
            {isGolden && <Shadow dx={0} dy={0} blur={8} color="rgba(229,192,92,0.6)" />}
            <Path path={path} color={color} style="fill" />
            <Path path={path} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={1} />
          </Group>
        );
      })}
      
      {highlightPath && (
        <Group>
          <Shadow dx={0} dy={0} blur={10} color="#00E5FF" />
          <Path path={highlightPath} color="transparent" style="stroke" strokeWidth={3} />
          <Path path={highlightPath} color="rgba(0,229,255,0.3)" style="fill" />
        </Group>
      )}
    </Group>
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={skiaTransform}>
            <Group transform={[{ translateX: -MAP_WIDTH }]}>{renderMapContent()}</Group>
            <Group>{renderMapContent()}</Group>
            <Group transform={[{ translateX: MAP_WIDTH }]}>{renderMapContent()}</Group>
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030508', // Cor espacial/marinha ultra escura
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030508',
  },
  loadingText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
