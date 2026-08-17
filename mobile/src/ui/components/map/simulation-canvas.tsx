import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, Group, Path, Skia, Atlas, useImage, DashPathEffect } from '@shopify/react-native-skia';
import type { SkPath, SkRSXform } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useDerivedValue, runOnJS, useAnimatedReaction, withSpring } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useUiStore } from '../../stores/use-ui-store';
import { CommandType } from '../../../core/types/commands';

const worldMapData = require('../../assets/data/world_map_data.json');

// ─── Pilar 1: Dados Flat ──────────────────────────────────────────────────────
const MAP_COLS = worldMapData.cols;
const MAP_ROWS = worldMapData.rows;
const RADIUS   = worldMapData.radius;
const MACRO_PATH_LAND_STR   = worldMapData.macroPathLand;
const MACRO_PATH_DESERT_STR = worldMapData.macroPathDesert || '';
const MACRO_PATH_TUNDRA_STR = worldMapData.macroPathTundra || '';

// Envelopamento IMUTÁVEL fora da UI Thread (Evita GC Leaks - Emenda Gemini #1)
const BIOMES = new Int8Array(worldMapData.biomes);

// ─── Matemática do Hexágono (Pilar 2) ──────────────────────────────────────────
const hexWidth = Math.sqrt(3) * RADIUS;
const yOffset  = 1.5 * RADIUS;
const MAP_WIDTH  = MAP_COLS * hexWidth;
const MAP_HEIGHT = MAP_ROWS * yOffset + RADIUS * 0.5;
const MACRO_ZOOM_THRESHOLD = 0.2;

const MAX_FACTIONS = 32;

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
  playerFactionId?: number;
  capitalHexId?: number;
}

export interface SimulationCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  focusOnCapital: (col: number, row: number, targetScale?: number) => void;
}

// ─── Paleta Visual ────────────────────────────────────────────────────────────
const FACTION_COLORS: string[] = [
  'transparent',   // 0
  'rgba(212, 175, 55, 0.75)', // 1 - Player
  'rgba(153, 27, 27, 0.65)',  // 2 - AI
  'rgba(30, 64, 175, 0.65)',  // 3
  'rgba(6, 95, 70, 0.65)',    // 4
  'rgba(107, 33, 168, 0.65)', // 5
  'rgba(154, 52, 18, 0.65)',  // 6
  'rgba(14, 116, 144, 0.65)', // 7
];

function getFactionColor(index: number): string {
  'worklet';
  return index < FACTION_COLORS.length ? FACTION_COLORS[index] : 'rgba(136, 136, 136, 0.65)';
}

function addHexToPath(pathOrBuilder: any, cx: number, cy: number, radius: number) {
  'worklet';
  for (let i = 0; i < 6; i++) {
    const angle_rad = (Math.PI / 180) * (60 * i - 30);
    const px = cx + radius * Math.cos(angle_rad);
    const py = cy + radius * Math.sin(angle_rad);
    if (i === 0) pathOrBuilder.moveTo(px, py);
    else pathOrBuilder.lineTo(px, py);
  }
  pathOrBuilder.close();
}

export const SimulationCanvas = forwardRef<SimulationCanvasRef, SimulationCanvasProps>(({
  regionOwner,
  currentArmyData,
  lastArmyData,
  mapUpdateTrigger,
  tickProgress,
  hexStructures,
  structureUpdateTrigger,
  dispatchCommand,
  playerFactionId = 1,
  capitalHexId,
}, ref) => {
  
  // ── Viewport state ──────────────────────────────────────────────────────────
  const INITIAL_SCALE = 0.5;
  const translateX = useSharedValue(-200);
  const translateY = useSharedValue(-130);
  const scale      = useSharedValue(INITIAL_SCALE);

  const savedTranslateX = useSharedValue(-200);
  const savedTranslateY = useSharedValue(-130);
  const savedScale      = useSharedValue(INITIAL_SCALE);

  const originFocalX = useSharedValue(0);
  const originFocalY = useSharedValue(0);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // ── API Imperativa (Zoom e Foco) ──
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const currentScale = scale.value;
      const next = Math.max(0.04, Math.min(currentScale * 1.5, 4.0));
      const ratio = next / currentScale;
      const cx = screenWidth / 2;
      const cy = screenHeight / 2;
      let targetX = cx - ((cx - translateX.value) * ratio);
      let targetY = cy - ((cy - translateY.value) * ratio);
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * next);
      targetY = Math.max(minTy, Math.min(0, targetY));
      const limitX = MAP_WIDTH * next;
      targetX = ((targetX % limitX) + limitX) % limitX;
      if (targetX > 0) targetX -= limitX;
      
      scale.value = next;
      translateX.value = targetX;
      translateY.value = targetY;
      savedScale.value = next;
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
    },
    zoomOut: () => {
      const currentScale = scale.value;
      const next = Math.max(0.04, Math.min(currentScale / 1.5, 4.0));
      const ratio = next / currentScale;
      const cx = screenWidth / 2;
      const cy = screenHeight / 2;
      let targetX = cx - ((cx - translateX.value) * ratio);
      let targetY = cy - ((cy - translateY.value) * ratio);
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * next);
      targetY = Math.max(minTy, Math.min(0, targetY));
      const limitX = MAP_WIDTH * next;
      targetX = ((targetX % limitX) + limitX) % limitX;
      if (targetX > 0) targetX -= limitX;
      
      scale.value = next;
      translateX.value = targetX;
      translateY.value = targetY;
      savedScale.value = next;
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
    },
    focusOnCapital: (col: number, row: number, targetScale?: number) => {
      // Calcula o cx/cy da capital
      const capX = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0);
      const capY = row * yOffset;
      const zoom = targetScale !== undefined ? targetScale : scale.value;
      
      let targetX = (screenWidth / 2) - (capX * zoom);
      let targetY = (screenHeight / 2) - (capY * zoom);
      
      // Clamp e Wrap
      const limitX = MAP_WIDTH * zoom;
      targetX = ((targetX % limitX) + limitX) % limitX;
      if (targetX > 0) targetX -= limitX;
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * zoom);
      targetY = Math.max(minTy, Math.min(0, targetY));
      
      scale.value = zoom;
      savedScale.value = zoom;
      translateX.value = targetX;
      translateY.value = targetY;
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
    }
  }));

  // Inicialização (se a capital for passada como hex ID numérico)
  React.useEffect(() => {
    if (capitalHexId !== undefined) {
      const col = capitalHexId % MAP_COLS;
      const row = Math.floor(capitalHexId / MAP_COLS);
      ref && (ref as any).current?.focusOnCapital(col, row);
    }
  }, [capitalHexId]);

  // ─── GESTOS (Pilar 5: Câmera Focal Absoluta) ────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      let newTx = savedTranslateX.value + e.translationX;
      let newTy = savedTranslateY.value + e.translationY;
      const limitX = MAP_WIDTH * scale.value;
      newTx = ((newTx % limitX) + limitX) % limitX;
      if (newTx > 0) newTx -= limitX;
      translateX.value = newTx;
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * scale.value);
      translateY.value = Math.max(minTy, Math.min(0, newTy));
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      originFocalX.value = e.focalX;
      originFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      const newScale = Math.max(0.04, Math.min(savedScale.value * e.scale, 4.0));
      const ratio = newScale / savedScale.value;
      scale.value = newScale;
      let targetX = originFocalX.value - ((originFocalX.value - savedTranslateX.value) * ratio);
      let targetY = originFocalY.value - ((originFocalY.value - savedTranslateY.value) * ratio);
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * newScale);
      targetY = Math.max(minTy, Math.min(0, targetY));
      const limitX = MAP_WIDTH * newScale;
      targetX = ((targetX % limitX) + limitX) % limitX;
      if (targetX > 0) targetX -= limitX;
      translateX.value = targetX;
      translateY.value = targetY;
    })
    .onEnd(() => { 
      savedScale.value = scale.value; 
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const handleMapTapJS = (id: number, owner: number) => {
    const store = useUiStore.getState();
    store.setSelection({ id, name: `Região ${id}`, biome: 'LAND', ownerFaction: owner }, null);
  };

  const tapGesture = Gesture.Tap().maxDistance(10).onEnd((e) => {
    let worldX = (e.x - translateX.value) / scale.value;
    const worldY = (e.y - translateY.value) / scale.value;
    worldX = ((worldX % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;

    const qFrac = (Math.sqrt(3) / 3 * worldX - 1 / 3 * worldY) / RADIUS;
    const rFrac = (2 / 3 * worldY) / RADIUS;
    let q = Math.round(qFrac);
    let s = Math.round(-qFrac - rFrac);
    let r = Math.round(rFrac);
    const qDiff = Math.abs(q - qFrac);
    const sDiff = Math.abs(s - (-qFrac - rFrac));
    const rDiff = Math.abs(r - rFrac);
    if      (qDiff > sDiff && qDiff > rDiff) q = -s - r;
    else if (sDiff > rDiff)                  s = -q - r;
    else                                     r = -q - s;

    // Aproximação axial -> offset (col, row)
    const row = r;
    const col = q + (row - (row & 1)) / 2;

    if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
      const id = row * MAP_COLS + col;
      if (BIOMES[id] > 0) { // Terra firme (Verde=1, Deserto=2, Tundra=3)
        const owner = regionOwner.value[id] ?? 0;
        runOnJS(handleMapTapJS)(id, owner);
      }
    }
  });

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // ─── Pilar 4: MACRO PATHS (Pré-Compilados por Bioma) ────────────────────────
  const macroLandSkPath = useMemo(() => Skia.Path.MakeFromSVGString(MACRO_PATH_LAND_STR) || Skia.Path.Make(), []);
  const macroDesertSkPath = useMemo(() => Skia.Path.MakeFromSVGString(MACRO_PATH_DESERT_STR) || Skia.Path.Make(), []);
  const macroTundraSkPath = useMemo(() => Skia.Path.MakeFromSVGString(MACRO_PATH_TUNDRA_STR) || Skia.Path.Make(), []);

  // Factions no Macro: Atualizado apenas quando a política de territórios muda
  const macroFactionsPaths = useSharedValue<SkPath[]>(Array(MAX_FACTIONS).fill(0).map(() => Skia.Path.Make()));
  
  useAnimatedReaction(
    () => mapUpdateTrigger.value,
    () => {
      const owners = regionOwner.value;
      const builders = Array(MAX_FACTIONS).fill(0).map(() => Skia.PathBuilder.Make());
      // Renderização simplificada com blocos quadrados para performance no Macro
      const rectSize = RADIUS * 1.5;
      for (let r = 0; r < MAP_ROWS; r++) {
        const cy = r * yOffset;
        const rowOff = r % 2 === 1 ? hexWidth / 2 : 0;
        for (let c = 0; c < MAP_COLS; c++) {
          const idx = r * MAP_COLS + c;
          const owner = owners[idx];
          if (owner > 0 && owner < MAX_FACTIONS) {
            const cx = c * hexWidth + rowOff;
            builders[owner].addRect(Skia.XYWHRect(cx - rectSize/2, cy - rectSize/2, rectSize, rectSize));
          }
        }
      }
      macroFactionsPaths.value = builders.map(b => b.detach());
    }
  );

  // ─── Pilar 3: MICRO VIEWPORT CULLING ────────────────────────────────────────
  const microPaths = useDerivedValue(() => {
    const s = scale.value;
    const blank = { land: Skia.Path.Make(), desert: Skia.Path.Make(), tundra: Skia.Path.Make(), stroke: Skia.Path.Make(), factions: Array(MAX_FACTIONS).fill(0).map(() => Skia.Path.Make()) };
    
    // Pilar 4: Culling Invertido - Ignorar cálculo pesado se estiver longe
    if (s < MACRO_ZOOM_THRESHOLD) return blank;

    const tx = translateX.value;
    const ty = translateY.value;
    const viewLeft = -tx / s;
    const viewTop = -ty / s;
    const viewRight = viewLeft + screenWidth / s;
    const viewBottom = viewTop + screenHeight / s;

    const startCol = Math.floor(viewLeft / hexWidth) - 2;
    const endCol = Math.ceil(viewRight / hexWidth) + 2;
    const startRow = Math.max(0, Math.floor(viewTop / yOffset) - 2);
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil(viewBottom / yOffset) + 2);

    const landBuilder = Skia.PathBuilder.Make();
    const desertBuilder = Skia.PathBuilder.Make();
    const tundraBuilder = Skia.PathBuilder.Make();
    const strokeBuilder = Skia.PathBuilder.Make();
    const factionBuilders = Array(MAX_FACTIONS).fill(0).map(() => Skia.PathBuilder.Make());
    const owners = regionOwner.value;

    for (let r = startRow; r <= endRow; r++) {
      const virtualCy = r * yOffset;
      const rowOffset = r % 2 === 1 ? hexWidth / 2 : 0;
      
      for (let c = startCol; c <= endCol; c++) {
        let actualCol = c % MAP_COLS;
        if (actualCol < 0) actualCol += MAP_COLS;
        
        const idx = r * MAP_COLS + actualCol;
        const biome = BIOMES[idx];
        if (biome > 0) { // Terra (Qualquer Bioma)
          const virtualCx = c * hexWidth + rowOffset;
          
          if (biome === 1) addHexToPath(landBuilder, virtualCx, virtualCy, RADIUS);
          else if (biome === 2) addHexToPath(desertBuilder, virtualCx, virtualCy, RADIUS);
          else if (biome === 3) addHexToPath(tundraBuilder, virtualCx, virtualCy, RADIUS);
          
          addHexToPath(strokeBuilder, virtualCx, virtualCy, RADIUS);
          
          const owner = owners[idx] ?? 0;
          if (owner > 0 && owner < MAX_FACTIONS) {
            addHexToPath(factionBuilders[owner], virtualCx, virtualCy, RADIUS - 1);
          }
        }
      }
    }

    return {
      land: landBuilder.detach(),
      desert: desertBuilder.detach(),
      tundra: tundraBuilder.detach(),
      stroke: strokeBuilder.detach(),
      factions: factionBuilders.map(b => b.detach())
    };
  });

  const microLandPath = useDerivedValue(() => microPaths.value.land);
  const microDesertPath = useDerivedValue(() => microPaths.value.desert);
  const microTundraPath = useDerivedValue(() => microPaths.value.tundra);
  const microStrokePath = useDerivedValue(() => microPaths.value.stroke);

  const MicroFactionOverlay = ({ index }: { index: number }) => {
    const pathSV = useDerivedValue(() => microPaths.value.factions[index]);
    const color = getFactionColor(index);
    return <Path path={pathSV} color={color} />;
  };

  const MacroFactionOverlay = ({ index }: { index: number }) => {
    const pathSV = useDerivedValue(() => macroFactionsPaths.value[index]);
    const color = getFactionColor(index);
    return <Path path={pathSV} color={color} />;
  };

  const factionIndices = Array.from({length: MAX_FACTIONS - 1}, (_, i) => i + 1);

  // ── DYNAMIC LAYER: sprites (Culling Dinâmico) ───────────────────────────────────
  const tokenImage = useImage(require('../../assets/images/token_base.png'));
  const cityImage  = useImage(require('../../assets/images/city_base.png'));

  const spritesTransforms = useDerivedValue(() => {
    const s = scale.value;
    const rsx: SkRSXform[] = [];
    const MAX_SPRITES = 1024;
    
    // Só desenha sprites no Micro
    if (s < MACRO_ZOOM_THRESHOLD) {
      for(let i=0; i<MAX_SPRITES; i++) rsx.push(Skia.RSXform(0,0,-9999,-9999));
      return rsx;
    }

    // Calcular view bounds novamente
    const tx = translateX.value;
    const ty = translateY.value;
    const viewLeft = -tx / s;
    const viewTop = -ty / s;
    const viewRight = viewLeft + screenWidth / s;
    const viewBottom = viewTop + screenHeight / s;
    
    const startCol = Math.floor(viewLeft / hexWidth) - 2;
    const endCol = Math.ceil(viewRight / hexWidth) + 2;
    const startRow = Math.max(0, Math.floor(viewTop / yOffset) - 2);
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil(viewBottom / yOffset) + 2);

    const structures = hexStructures.value;
    let active = 0;

    for (let r = startRow; r <= endRow && active < MAX_SPRITES; r++) {
      const virtualCy = r * yOffset;
      const rowOffset = r % 2 === 1 ? hexWidth / 2 : 0;
      for (let c = startCol; c <= endCol && active < MAX_SPRITES; c++) {
        let actualCol = c % MAP_COLS;
        if (actualCol < 0) actualCol += MAP_COLS;
        const idx = r * MAP_COLS + actualCol;
        
        if (structures[idx] > 0) {
          const virtualCx = c * hexWidth + rowOffset;
          rsx.push(Skia.RSXform(1, 0, virtualCx - 16, virtualCy - 16));
          active++;
        }
      }
    }
    
    while(rsx.length < MAX_SPRITES) rsx.push(Skia.RSXform(0,0,-9999,-9999));
    return rsx;
  });

  const citySprites = useMemo(() => new Array(1024).fill(Skia.XYWHRect(0, 0, 32, 32)), []);

  const mapLens = useUiStore(s => s.mapLens);

  return (
    <GestureDetector gesture={composedGestures}>
      <View style={styles.container}>
        <Canvas style={styles.canvas}>
          <Group transform={transform as any}>
            
            {/* ============================================================== */}
            {/* MICRO VIEWPORT (LOD Alto)                                      */}
            {/* ============================================================== */}
            <Group opacity={useDerivedValue(() => scale.value >= MACRO_ZOOM_THRESHOLD ? 1 : 0)}>
              <Path path={microLandPath} color={mapLens === 'PHYSICAL' ? "#14532D" : "#F0E6D2"} />
              <Path path={microDesertPath} color={mapLens === 'PHYSICAL' ? "#92400E" : "#F0E6D2"} />
              <Path path={microTundraPath} color={mapLens === 'PHYSICAL' ? "#E2E8F0" : "#F0E6D2"} />
              
              <Path path={microStrokePath} color={mapLens === 'PHYSICAL' ? "rgba(0,0,0,0.15)" : "rgba(139,69,19,0.15)"} style="stroke" strokeWidth={0.5} />
              {factionIndices.map(i => <MicroFactionOverlay key={i} index={i} />)}
              {cityImage && <Atlas image={cityImage} sprites={citySprites} transforms={spritesTransforms} />}
            </Group>

            {/* ============================================================== */}
            {/* MACRO VIEWPORT (LOD Baixo)                                     */}
            {/* ============================================================== */}
            <Group opacity={useDerivedValue(() => scale.value < MACRO_ZOOM_THRESHOLD ? 1 : 0)}>
              {/* Esquerda */}
              <Group transform={[{ translateX: -MAP_WIDTH }]}>
                <Path path={macroLandSkPath} color={mapLens === 'PHYSICAL' ? "#14532D" : "#F0E6D2"} />
                <Path path={macroDesertSkPath} color={mapLens === 'PHYSICAL' ? "#92400E" : "#F0E6D2"} />
                <Path path={macroTundraSkPath} color={mapLens === 'PHYSICAL' ? "#E2E8F0" : "#F0E6D2"} />
                {factionIndices.map(i => <MacroFactionOverlay key={i} index={i} />)}
              </Group>
              
              {/* Centro */}
              <Group>
                <Path path={macroLandSkPath} color={mapLens === 'PHYSICAL' ? "#14532D" : "#F0E6D2"} />
                <Path path={macroDesertSkPath} color={mapLens === 'PHYSICAL' ? "#92400E" : "#F0E6D2"} />
                <Path path={macroTundraSkPath} color={mapLens === 'PHYSICAL' ? "#E2E8F0" : "#F0E6D2"} />
                {factionIndices.map(i => <MacroFactionOverlay key={i} index={i} />)}
              </Group>
              
              {/* Direita */}
              <Group transform={[{ translateX: MAP_WIDTH }]}>
                <Path path={macroLandSkPath} color={mapLens === 'PHYSICAL' ? "#14532D" : "#F0E6D2"} />
                <Path path={macroDesertSkPath} color={mapLens === 'PHYSICAL' ? "#92400E" : "#F0E6D2"} />
                <Path path={macroTundraSkPath} color={mapLens === 'PHYSICAL' ? "#E2E8F0" : "#F0E6D2"} />
                {factionIndices.map(i => <MacroFactionOverlay key={i} index={i} />)}
              </Group>
            </Group>

          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F2D5E' }, // Oceano como fundo base
  canvas:    { flex: 1 },
});
