import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, Skia, Atlas, useImage, DashPathEffect } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useUiStore } from '../../stores/use-ui-store';
import { CommandType } from '../../../core/types/commands';

const worldMapData = require('../../assets/data/world_map_data.json');

export interface SimulationCanvasProps {
  regionOwner: SharedValue<Int32Array>;
  currentArmyData: SharedValue<Float32Array>;
  lastArmyData: SharedValue<Float32Array>;
  mapUpdateTrigger: SharedValue<number>;
  tickProgress: SharedValue<number>;
  hexStructures: SharedValue<Int32Array>;
  structureUpdateTrigger: SharedValue<number>;
  combatEventHead?: SharedValue<number>;
  combatEventX?: SharedValue<Float32Array>;
  combatEventY?: SharedValue<Float32Array>;
  combatEventTs?: SharedValue<Float32Array>;
  visibilityMask?: SharedValue<Uint8Array>;
  visionUpdateTrigger?: SharedValue<number>;
  dispatchCommand: (cmd: [number, number, number, number]) => void;
}

const spatialMap = new Map<string, any>();
const centroidMap = new Map<number, {x: number, y: number}>();
// Guard defensivo: regions pode ser undefined se o JSON for um mock vazio
(worldMapData.regions ?? []).forEach((region: any) => {
  spatialMap.set(`${region.q},${region.r}`, region);
  centroidMap.set(region.id, { x: region.cx, y: region.cy });
});

const RADIUS = worldMapData.hexRadius ?? 20;
const SQRT3 = Math.sqrt(3);

const BIOME_COLORS: Record<string, string> = {
  "WATER": "#1E3A8A",
  "DESERT": "#B45309",
  "LAND": "#15803D"
};

function getHexPoints(cx: number, cy: number, radius: number) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i - 30;
    const angle_rad = (Math.PI / 180) * angle_deg;
    pts.push({
      x: cx + radius * Math.cos(angle_rad),
      y: cy + radius * Math.sin(angle_rad)
    });
  }
  return pts;
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export function SimulationCanvas({ regionOwner, currentArmyData, lastArmyData, mapUpdateTrigger, tickProgress, hexStructures, structureUpdateTrigger, combatEventHead, combatEventX, combatEventY, combatEventTs, dispatchCommand }: SimulationCanvasProps) {
  const hexagons = worldMapData.regions ?? worldMapData.hexagons ?? [];
  if (!hexagons || hexagons.length === 0) {
    return null;
  }

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const tokenImage = useImage(require('../../assets/images/token_base.png'));
  
  const atlasSprites = useMemo(() => {
    return new Array(2048).fill(Skia.XYWHRect(0, 0, 32, 32));
  }, []);

  // JS handler for React side
  const handleMapTapJS = (
    hitHexId: number, 
    hitHexName: string, 
    hitHexBiome: string, 
    ownerFaction: number, 
    hitArmyIndex: number | null, 
    hitArmyFaction: number | null, 
    hitArmyManpower: number | null
  ) => {
    const store = useUiStore.getState();

    if (store.uiMode === 'DEFAULT') {
      const hex = { id: hitHexId, name: hitHexName, biome: hitHexBiome, ownerFaction };
      const army = hitArmyIndex !== null ? { index: hitArmyIndex, faction: hitArmyFaction!, manpower: hitArmyManpower! } : null;
      store.setSelection(hex, army);
    } else if (store.uiMode === 'COMMAND_MOVE') {
      if (store.selectedArmy) {
        dispatchCommand([CommandType.MOVE_ARMY, store.playerFactionId, store.selectedArmy.index, hitHexId]);
        store.addPendingMove(store.selectedArmy.index, hitHexId);
      }
      store.setUiMode('DEFAULT');
      store.clearSelection();
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const worldX = (e.x - translateX.value) / scale.value;
      const worldY = (e.y - translateY.value) / scale.value;

      const qFrac = (SQRT3 / 3 * worldX - 1 / 3 * worldY) / RADIUS;
      const rFrac = (2 / 3 * worldY) / RADIUS;

      let q = Math.round(qFrac);
      let s = Math.round(-qFrac - rFrac);
      let r = Math.round(rFrac);

      const qDiff = Math.abs(q - qFrac);
      const sDiff = Math.abs(s - (-qFrac - rFrac));
      const rDiff = Math.abs(r - rFrac);

      if (qDiff > sDiff && qDiff > rDiff) {
        q = -s - r;
      } else if (sDiff > rDiff) {
        s = -q - r;
      } else {
        r = -q - s;
      }

      const key = `${q},${r}`;
      const hitRegion = spatialMap.get(key);

      if (hitRegion) {
        let hitArmyIndex: number | null = null;
        let hitArmyFaction: number | null = null;
        let hitArmyManpower: number | null = null;

        const data = currentArmyData.value;
        for (let i = 0; i < 2048; i++) {
          const offset = i * 4;
          const faction = data[offset];
          if (faction === -1) continue;
          
          const stationedIndex = data[offset + 1];
          if (stationedIndex === hitRegion.id) {
            hitArmyIndex = i;
            hitArmyFaction = faction;
            hitArmyManpower = data[offset + 3];
            break;
          }
        }

        const owner = regionOwner.value[hitRegion.id];
        runOnJS(handleMapTapJS)(
          hitRegion.id, hitRegion.name, hitRegion.biome, owner, 
          hitArmyIndex, hitArmyFaction, hitArmyManpower
        );
      }
    });

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value }
  ]);

  const staticLayers = useMemo(() => {
    const biomeMap = new Map<string, ReturnType<typeof Skia.Path.Make>>();
    const strokeP = Skia.Path.Make();

    (worldMapData.regions ?? []).forEach((r: any) => {
      const bColor = BIOME_COLORS[r.biome] || "#333333";
      let bp = biomeMap.get(bColor);
      if (!bp) {
        bp = Skia.Path.Make();
        biomeMap.set(bColor, bp);
      }
      
      const pts = getHexPoints(r.cx, r.cy, RADIUS);
      bp.addPoly(pts, true);
      strokeP.addPoly(pts, true);
    });

    return {
      biomePaths: Array.from(biomeMap.entries()).map(([color, path]) => ({ color, path })),
      strokePath: strokeP
    };
  }, []);

  const atlasTransforms = useDerivedValue(() => {
    const p = tickProgress.value;
    const current = currentArmyData.value;
    const last = lastArmyData.value;
    const rsx: ReturnType<typeof Skia.RSXform>[] = [];
    
    for (let i = 0; i < 2048; i++) {
      const offset = i * 4;
      const faction = current[offset];
      
      if (faction === -1) {
        rsx.push(Skia.RSXform(0, 0, -9999, -9999));
        continue;
      }
      
      const currStationed = current[offset + 1];
      const lastStationed = last[offset + 1];
      
      const startID = last[offset] === -1 ? currStationed : lastStationed;
      
      const startPos = centroidMap.get(startID) || {x: -9999, y: -9999};
      const endPos = centroidMap.get(currStationed) || {x: -9999, y: -9999};
      
      const tx = lerp(startPos.x, endPos.x, p);
      const ty = lerp(startPos.y, endPos.y, p);
      
      rsx.push(Skia.RSXform(1, 0, tx - 16, ty - 16));
    }
    
    return rsx;
  });

  // PathingLayer: Gera as linhas Otimistas
  const pendingMoves = useUiStore((state) => state.pendingMoves);
  const cityImage = useImage(require('../../assets/images/city_base.png'));

  const CITY_SPRITES_COUNT = 2000;

  const cityTransforms = useDerivedValue(() => {
    const trigger = structureUpdateTrigger.value; // Força reatividade apenas sob demanda
    const structures = hexStructures.value;
    const rsx: ReturnType<typeof Skia.RSXform>[] = [];
    let activeIdx = 0;

    for (let i = 0; i < structures.length && activeIdx < CITY_SPRITES_COUNT; i++) {
      if (structures[i] > 0) {
        const pos = centroidMap.get(i);
        if (pos) {
          rsx.push(Skia.RSXform(1, 0, pos.x - 16, pos.y - 16));
          activeIdx++;
        }
      }
    }
    // Preenche o restante com entradas fantasma para manter o comprimento cravado
    while (rsx.length < CITY_SPRITES_COUNT) {
      rsx.push(Skia.RSXform(0, 0, -9999, -9999));
    }
    return rsx;
  });

  const citySprites = useMemo(() => {
    return new Array(2000).fill(Skia.XYWHRect(0, 0, 32, 32));
  }, []);

  const battleImage = useImage(require('../../assets/images/battle_icon.png'));

  const BATTLE_SPRITES_COUNT = 1024;

  const battleTransforms = useDerivedValue(() => {
    const rsx: ReturnType<typeof Skia.RSXform>[] = [];

    if (combatEventHead && combatEventX && combatEventY && combatEventTs) {
      const cx = combatEventX.value;
      const cy = combatEventY.value;
      const cts = combatEventTs.value;
      const now = Date.now();

      for (let i = 0; i < BATTLE_SPRITES_COUNT; i++) {
        const ts = cts[i];
        if (ts > 0 && now - ts < 1000) {
          const age = now - ts;
          const s = 1 - (age / 1000);
          rsx.push(Skia.RSXform(s, 0, cx[i] - (16 * s), cy[i] - (16 * s)));
        } else {
          // Entrada fantasma: invisível mas mantém o comprimento do array
          rsx.push(Skia.RSXform(0, 0, -9999, -9999));
        }
      }
    } else {
      // Sem dados de combate: preenche tudo com entradas fantasma
      for (let i = 0; i < BATTLE_SPRITES_COUNT; i++) {
        rsx.push(Skia.RSXform(0, 0, -9999, -9999));
      }
    }
    return rsx;
  });

  const battleSprites = useMemo(() => {
    return new Array(1024).fill(Skia.XYWHRect(0, 0, 32, 32));
  }, []);

  const pathingPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const current = currentArmyData.value;
    const p = tickProgress.value;
    const last = lastArmyData.value;

    for (const [armyIdxStr, targetId] of Object.entries(pendingMoves)) {
      const i = parseInt(armyIdxStr, 10);
      const offset = i * 4;
      const faction = current[offset];
      
      if (faction === -1) continue;

      const currStationed = current[offset + 1];
      const lastStationed = last[offset + 1];
      const startID = last[offset] === -1 ? currStationed : lastStationed;
      
      const startPos = centroidMap.get(startID) || {x: 0, y: 0};
      const endPos = centroidMap.get(currStationed) || {x: 0, y: 0};
      
      const tx = lerp(startPos.x, endPos.x, p);
      const ty = lerp(startPos.y, endPos.y, p);

      const targetPos = centroidMap.get(targetId);
      if (targetPos) {
        path.moveTo(tx, ty);
        path.lineTo(targetPos.x, targetPos.y);
      }
    }
    return path;
  });

  return (
    <GestureDetector gesture={composedGestures}>
      <View style={styles.container}>
        <Canvas style={styles.canvas}>
          <Group transform={transform as any}>
            
            {staticLayers.biomePaths.map(bp => (
              <Path key={bp.color} path={bp.path} color={bp.color} />
            ))}
            
            <Path 
              path={staticLayers.strokePath} 
              color="rgba(0,0,0,0.15)" 
              style="stroke" 
              strokeWidth={1} 
            />

            {cityImage && (
              <Atlas 
                image={cityImage} 
                sprites={citySprites} 
                transforms={cityTransforms} 
              />
            )}

            {tokenImage && (
              <Atlas 
                image={tokenImage} 
                sprites={atlasSprites} 
                transforms={atlasTransforms} 
              />
            )}

            {battleImage && (
              <Atlas 
                image={battleImage} 
                sprites={battleSprites} 
                transforms={battleTransforms} 
              />
            )}

            <Path
              path={pathingPath}
              color="#FBBF24"
              style="stroke"
              strokeWidth={4}
            >
              <DashPathEffect intervals={[10, 10]} />
            </Path>

          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  canvas: { flex: 1 }
});






