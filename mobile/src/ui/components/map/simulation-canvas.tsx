import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, Group, Path, Skia, Atlas, useImage, DashPathEffect } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useDerivedValue, runOnJS, useAnimatedReaction, withSpring } from 'react-native-reanimated';
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
  playerFactionId?: number;
  capitalHexId?: number;
}

const MAX_FACTIONS = 32;

// ─── Module-level lookup tables (built once from the JSON) ────────────────────
const spatialMap  = new Map<string, any>();
const centroidMap = new Map<number, { x: number; y: number }>();
const regions: any[] = worldMapData.regions ?? worldMapData.hexagons ?? [];

regions.forEach((region: any) => {
  spatialMap.set(`${region.q},${region.r}`, region);
  centroidMap.set(region.id, { x: region.cx, y: region.cy });
});

const RADIUS = worldMapData.hexRadius ?? 20;
const SQRT3  = Math.sqrt(3);

// ─── Visual palette ───────────────────────────────────────────────────────────
// Biome names match world-definitions-v1.json: tundra, temperate, desert, tropical
const BIOME_COLORS: Record<string, string> = {
  TUNDRA:   '#2D3748',   // cold grey-blue (arctic/boreal)
  LAND:     '#14532D',   // dark forest green (temperate → mapped as LAND)
  DESERT:   '#92400E',   // amber-brown
  TROPICAL: '#065F46',   // deep emerald (jungle)
  WATER:    '#0F2D5E',   // deep navy (fallback)
};

// Faction colour palette (index 0 = neutral, 1 = player, 2-N = AI factions)
const FACTION_COLORS: string[] = [
  'transparent',   // 0 — neutral / unclaimed
  '#D4AF37',       // 1 — Player (gold)
  '#991B1B',       // 2 — AI Red
  '#1E40AF',       // 3 — AI Blue
  '#065F46',       // 4 — AI Green
  '#6B21A8',       // 5 — AI Purple
  '#9A3412',       // 6 — AI Orange
  '#0E7490',       // 7 — AI Cyan
];

const PLAYER_FACTION_ALPHA = 'CC';  // ~80% opacity overlay for player territory
const AI_FACTION_ALPHA     = '88';  // ~53% opacity for AI territory

// ─── Utility helpers ──────────────────────────────────────────────────────────
function getFactionColor(index: number, isPlayer: boolean): string {
  'worklet';
  const base = index < FACTION_COLORS.length ? FACTION_COLORS[index] : '#888888';
  if (index === 0) return 'transparent';
  return base + (isPlayer ? PLAYER_FACTION_ALPHA : AI_FACTION_ALPHA);
}

function getHexPoints(cx: number, cy: number, radius: number) {
  'worklet';
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle_rad = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: cx + radius * Math.cos(angle_rad), y: cy + radius * Math.sin(angle_rad) });
  }
  return pts;
}

function addHexToPath(pathOrBuilder: any, cx: number, cy: number, radius: number) {
  'worklet';
  for (let i = 0; i < 6; i++) {
    const angle_rad = (Math.PI / 180) * (60 * i - 30);
    const px = cx + radius * Math.cos(angle_rad);
    const py = cy + radius * Math.sin(angle_rad);
    if (i === 0) {
      pathOrBuilder.moveTo(px, py);
    } else {
      pathOrBuilder.lineTo(px, py);
    }
  }
  pathOrBuilder.close();
}

function lerp(start: number, end: number, t: number) {
  'worklet';
  return start + (end - start) * t;
}

// ─── FactionPath Wrapper Component ────────────────────────────────────────────
// Pre-allocates rendering of paths to avoid React render cycle warnings
const FactionPath = ({
  factionIndex,
  paths,
  triggerSV,
  isPlayer
}: {
  factionIndex: number;
  paths: SkPath[];
  triggerSV: SharedValue<number>;
  isPlayer: boolean;
}) => {
  const pathSV = useDerivedValue(() => {
    const _ = triggerSV.value; // Force reactivity when triggered
    return paths[factionIndex];
  });
  
  const colorSV = useDerivedValue(() => {
    return getFactionColor(factionIndex, isPlayer);
  });

  return <Path path={pathSV} color={colorSV} />;
};

// ─── SimulationCanvas ─────────────────────────────────────────────────────────
export interface SimulationCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
}

export const SimulationCanvas = forwardRef<SimulationCanvasRef, SimulationCanvasProps>(({
  regionOwner,
  currentArmyData,
  lastArmyData,
  mapUpdateTrigger,
  tickProgress,
  hexStructures,
  structureUpdateTrigger,
  combatEventHead,
  combatEventX,
  combatEventY,
  combatEventTs,
  dispatchCommand,
  playerFactionId = 1,
  capitalHexId,
}, ref) => {

  if (!regions || regions.length === 0) {
    return null;
  }

  // ── Viewport state ──────────────────────────────────────────────────────────
  // Start zoomed out so the full world is visible (canvas is 3000x2000, device ~400px wide)
  const INITIAL_SCALE = 0.5; // Slightly closer than previous overview
  const MAP_WIDTH = 3000;
  const MAP_HEIGHT = 1750;
  const translateX = useSharedValue(-200);
  const translateY = useSharedValue(-130);
  const scale      = useSharedValue(INITIAL_SCALE);

  const savedTranslateX = useSharedValue(-200);
  const savedTranslateY = useSharedValue(-130);
  const savedScale      = useSharedValue(INITIAL_SCALE);

  const originFocalX = useSharedValue(0);
  const originFocalY = useSharedValue(0);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Manual zoom controls exposed via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const currentScale = scale.value;
      const next = Math.max(0.08, Math.min(currentScale * 1.5, 3.0));
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
      
      scale.value = withSpring(next, { damping: 15, stiffness: 100 });
      translateX.value = withSpring(targetX, { damping: 15, stiffness: 100 });
      translateY.value = withSpring(targetY, { damping: 15, stiffness: 100 });
      
      savedScale.value = next;
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
    },
    zoomOut: () => {
      const currentScale = scale.value;
      const next = Math.max(0.08, Math.min(currentScale / 1.5, 3.0));
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
      
      scale.value = withSpring(next, { damping: 15, stiffness: 100 });
      translateX.value = withSpring(targetX, { damping: 15, stiffness: 100 });
      translateY.value = withSpring(targetY, { damping: 15, stiffness: 100 });
      
      savedScale.value = next;
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
    }
  }));

  // Initialize camera to player capital
  React.useEffect(() => {
    if (capitalHexId !== undefined && centroidMap.has(capitalHexId)) {
      const center = centroidMap.get(capitalHexId)!;
      
      let newTx = (screenWidth / 2) - (center.x * INITIAL_SCALE);
      let newTy = (screenHeight / 2) - (center.y * INITIAL_SCALE);
      
      // Wrap X
      const limitX = MAP_WIDTH * INITIAL_SCALE;
      newTx = ((newTx % limitX) + limitX) % limitX;
      if (newTx > 0) newTx -= limitX;
      
      // Clamp Y
      const maxTy = 0;
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * INITIAL_SCALE);
      newTy = Math.max(minTy, Math.min(maxTy, newTy));
      
      translateX.value = newTx;
      translateY.value = newTy;
      savedTranslateX.value = newTx;
      savedTranslateY.value = newTy;
    }
  }, [capitalHexId]);

  // ── Images ──────────────────────────────────────────────────────────────────
  const tokenImage = useImage(require('../../assets/images/token_base.png'));
  const cityImage  = useImage(require('../../assets/images/city_base.png'));
  const battleImage = useImage(require('../../assets/images/battle_icon.png'));

  // ── Sprite arrays (fixed-length for Atlas) ──────────────────────────────────
  const atlasSprites = useMemo(() => new Array(2048).fill(Skia.XYWHRect(0, 0, 32, 32)), []);
  const citySprites  = useMemo(() => new Array(2000).fill(Skia.XYWHRect(0, 0, 32, 32)), []);
  const battleSprites = useMemo(() => new Array(1024).fill(Skia.XYWHRect(0, 0, 32, 32)), []);

  // ── JS tap handler (runs on React thread) ───────────────────────────────────
  const handleMapTapJS = (
    hitHexId: number,
    hitHexName: string,
    hitHexBiome: string,
    ownerFaction: number,
    hitArmyIndex: number | null,
    hitArmyFaction: number | null,
    hitArmyManpower: number | null,
  ) => {
    const store = useUiStore.getState();
    if (store.uiMode === 'DEFAULT') {
      store.setSelection(
        { id: hitHexId, name: hitHexName, biome: hitHexBiome, ownerFaction },
        hitArmyIndex !== null ? { index: hitArmyIndex, faction: hitArmyFaction!, manpower: hitArmyManpower! } : null,
      );
    } else if (store.uiMode === 'COMMAND_MOVE') {
      if (store.selectedArmy) {
        dispatchCommand([CommandType.MOVE_ARMY, store.playerFactionId, store.selectedArmy.index, hitHexId]);
        store.addPendingMove(store.selectedArmy.index, hitHexId);
      }
      store.setUiMode('DEFAULT');
      store.clearSelection();
    }
  };

  // ── Gestures ─────────────────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      let newTx = savedTranslateX.value + e.translationX;
      let newTy = savedTranslateY.value + e.translationY;
      
      // Wrap X
      const limitX = MAP_WIDTH * scale.value;
      newTx = ((newTx % limitX) + limitX) % limitX;
      if (newTx > 0) newTx -= limitX;
      translateX.value = newTx;
      
      // Clamp Y
      const maxTy = 0;
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * scale.value);
      translateY.value = Math.max(minTy, Math.min(maxTy, newTy));
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
      const newScale = Math.max(0.08, Math.min(savedScale.value * e.scale, 3.0));
      const ratio = newScale / savedScale.value;
      scale.value = newScale;
      
      let targetX = originFocalX.value - ((originFocalX.value - savedTranslateX.value) * ratio);
      let targetY = originFocalY.value - ((originFocalY.value - savedTranslateY.value) * ratio);
      
      // Clamp Y
      const maxTy = 0;
      const minTy = Math.min(0, screenHeight - MAP_HEIGHT * newScale);
      targetY = Math.max(minTy, Math.min(maxTy, targetY));
      
      // Wrap X
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

  const tapGesture = Gesture.Tap().onEnd((e) => {
    let worldX = (e.x - translateX.value) / scale.value;
    const worldY = (e.y - translateY.value) / scale.value;
    
    // Wrap tapped coordinate
    worldX = ((worldX % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;

    const qFrac = (SQRT3 / 3 * worldX - 1 / 3 * worldY) / RADIUS;
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

    const hitRegion = spatialMap.get(`${q},${r}`);
    if (!hitRegion) return;

    let hitArmyIndex: number | null = null;
    let hitArmyFaction: number | null = null;
    let hitArmyManpower: number | null = null;

    const data = currentArmyData.value;
    for (let i = 0; i < 2048; i++) {
      const offset = i * 4;
      const faction = data[offset];
      if (faction === -1) continue;
      if (data[offset + 1] === hitRegion.id) {
        hitArmyIndex   = i;
        hitArmyFaction = faction;
        hitArmyManpower = data[offset + 3];
        break;
      }
    }

    const owner = regionOwner.value[hitRegion.id] ?? 0;
    runOnJS(handleMapTapJS)(hitRegion.id, hitRegion.name, hitRegion.biome, owner, hitArmyIndex, hitArmyFaction, hitArmyManpower);
  });

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  // ── STATIC LAYER: biome fill + stroke (computed once at mount) ──────────────
  const staticLayers = useMemo(() => {
    const biomeMap = new Map<string, ReturnType<typeof Skia.PathBuilder.Make>>();
    const strokeBuilder = Skia.PathBuilder.Make();

    regions.forEach((r: any) => {
      const bColor = BIOME_COLORS[r.biome] ?? '#2D2D2D';
      let bp = biomeMap.get(bColor);
      if (!bp) { bp = Skia.PathBuilder.Make(); biomeMap.set(bColor, bp); }
      
      addHexToPath(bp, r.cx, r.cy, RADIUS);
      // Only draw grid strokes on non-water hex to reduce visual noise
      if (!r.isWater) addHexToPath(strokeBuilder, r.cx, r.cy, RADIUS);
    });

    return {
      biomePaths: Array.from(biomeMap.entries()).map(([color, builder]) => ({ color, path: builder.detach() })),
      strokePath: strokeBuilder.detach(),
    };
  }, []);

  // ── DYNAMIC LAYER: territory ownership ─────────────────────────────────────
  // Pre-allocate MAX_FACTIONS Skia paths.
  const factionPaths = useMemo(() => {
    return Array(MAX_FACTIONS).fill(0).map(() => Skia.Path.Make());
  }, []);
  
  // Shared value just to trigger re-renders in useDerivedValues inside FactionPath
  const pathsTrigger = useSharedValue(0);

  useAnimatedReaction(
    () => mapUpdateTrigger.value,
    () => {
      const owners = regionOwner.value;

      // 1. Create new builders for each faction
      const builders = Array(MAX_FACTIONS).fill(0).map(() => Skia.PathBuilder.Make());

      // 2. Build new geometry
      for (let i = 0; i < regions.length; i++) {
        const r = regions[i];
        if (r.isWater) continue; // skip water tiles
        
        const owner = owners[r.id] ?? 0;
        if (owner > 0 && owner < MAX_FACTIONS) {
          addHexToPath(builders[owner], r.cx, r.cy, RADIUS - 1); // slightly inset
        }
      }

      // 3. Make immutable paths and update array
      for (let i = 0; i < MAX_FACTIONS; i++) {
        factionPaths[i] = builders[i].detach();
      }

      // 4. Trigger Skia to redraw the updated paths
      pathsTrigger.value += 1;
    }
  );

  // We can statically render FactionPath components (0 is neutral, skip rendering it)
  const factionPathElements = useMemo(() => {
    const elements = [];
    for (let i = 1; i < MAX_FACTIONS; i++) {
      elements.push(
        <FactionPath
          key={i}
          factionIndex={i}
          paths={factionPaths}
          triggerSV={pathsTrigger}
          isPlayer={i === playerFactionId}
        />
      );
    }
    return elements;
  }, [factionPaths, pathsTrigger, playerFactionId]);

  // ── DYNAMIC LAYER: selected hex highlight ───────────────────────────────────
  const pendingMoves = useUiStore((state) => state.pendingMoves);

  // ── DYNAMIC LAYER: army sprites (Atlas) ─────────────────────────────────────
  const atlasTransforms = useDerivedValue(() => {
    const p       = tickProgress.value;
    const current = currentArmyData.value;
    const last    = lastArmyData.value;
    const rsx: ReturnType<typeof Skia.RSXform>[] = [];

    for (let i = 0; i < 2048; i++) {
      const offset  = i * 4;
      const faction = current[offset];
      if (faction === -1) { rsx.push(Skia.RSXform(0, 0, -9999, -9999)); continue; }

      const currStationed = current[offset + 1];
      const lastStationed = last[offset + 1];
      const startID = last[offset] === -1 ? currStationed : lastStationed;

      const startPos = centroidMap.get(startID) ?? { x: -9999, y: -9999 };
      const endPos   = centroidMap.get(currStationed) ?? { x: -9999, y: -9999 };

      rsx.push(Skia.RSXform(1, 0, lerp(startPos.x, endPos.x, p) - 16, lerp(startPos.y, endPos.y, p) - 16));
    }
    return rsx;
  });

  // ── DYNAMIC LAYER: city sprites (Atlas) ─────────────────────────────────────
  const CITY_SPRITES_COUNT = 2000;
  const cityTransforms = useDerivedValue(() => {
    const _trigger = structureUpdateTrigger.value;
    const structures = hexStructures.value;
    const rsx: ReturnType<typeof Skia.RSXform>[] = [];
    let activeIdx = 0;

    for (let i = 0; i < structures.length && activeIdx < CITY_SPRITES_COUNT; i++) {
      if (structures[i] > 0) {
        const pos = centroidMap.get(i);
        if (pos) { rsx.push(Skia.RSXform(1, 0, pos.x - 16, pos.y - 16)); activeIdx++; }
      }
    }
    while (rsx.length < CITY_SPRITES_COUNT) rsx.push(Skia.RSXform(0, 0, -9999, -9999));
    return rsx;
  });

  // ── DYNAMIC LAYER: battle flash sprites ─────────────────────────────────────
  const BATTLE_SPRITES_COUNT = 1024;
  const battleTransforms = useDerivedValue(() => {
    const rsx: ReturnType<typeof Skia.RSXform>[] = [];
    if (combatEventHead && combatEventX && combatEventY && combatEventTs) {
      const cx  = combatEventX.value;
      const cy  = combatEventY.value;
      const cts = combatEventTs.value;
      const now = Date.now();
      for (let i = 0; i < BATTLE_SPRITES_COUNT; i++) {
        const ts = cts[i];
        if (ts > 0 && now - ts < 1000) {
          const s = 1 - (now - ts) / 1000;
          rsx.push(Skia.RSXform(s, 0, cx[i] - 16 * s, cy[i] - 16 * s));
        } else {
          rsx.push(Skia.RSXform(0, 0, -9999, -9999));
        }
      }
    } else {
      for (let i = 0; i < BATTLE_SPRITES_COUNT; i++) rsx.push(Skia.RSXform(0, 0, -9999, -9999));
    }
    return rsx;
  });

  // ── DYNAMIC LAYER: army movement lines ──────────────────────────────────────
  const pathingPath = useDerivedValue(() => {
    const path    = Skia.Path.Make();
    const current = currentArmyData.value;
    const last    = lastArmyData.value;
    const p       = tickProgress.value;

    for (const [armyIdxStr, targetId] of Object.entries(pendingMoves)) {
      const i      = parseInt(armyIdxStr, 10);
      const offset = i * 4;
      if (current[offset] === -1) continue;

      const currStationed = current[offset + 1];
      const lastStationed = last[offset + 1];
      const startID = last[offset] === -1 ? currStationed : lastStationed;

      const startPos = centroidMap.get(startID) ?? { x: 0, y: 0 };
      const endPos   = centroidMap.get(currStationed) ?? { x: 0, y: 0 };
      const tx = lerp(startPos.x, endPos.x, p);
      const ty = lerp(startPos.y, endPos.y, p);

      const targetPos = centroidMap.get(targetId);
      if (targetPos) { path.moveTo(tx, ty); path.lineTo(targetPos.x, targetPos.y); }
    }
    return path;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderMapLayers = () => (
    <>
      {/* ── Layer 1: Biome fill (static, batched per biome) ── */}
      {staticLayers.biomePaths.map(bp => (
        <Path key={bp.color} path={bp.path} color={bp.color} />
      ))}

      {/* ── Layer 2: Hex grid stroke (static) ── */}
      <Path
        path={staticLayers.strokePath}
        color="rgba(0,0,0,0.20)"
        style="stroke"
        strokeWidth={0.8}
      />

      {/* ── Layer 3: Territory ownership overlay (dynamic, batched per faction) ── */}
      {factionPathElements}

      {/* ── Layer 4: City sprites ── */}
      {cityImage && (
        <Atlas image={cityImage} sprites={citySprites} transforms={cityTransforms} />
      )}

      {/* ── Layer 5: Army sprites ── */}
      {tokenImage && (
        <Atlas image={tokenImage} sprites={atlasSprites} transforms={atlasTransforms} />
      )}

      {/* ── Layer 6: Battle flash ── */}
      {battleImage && (
        <Atlas image={battleImage} sprites={battleSprites} transforms={battleTransforms} />
      )}

      {/* ── Layer 7: Pending move lines ── */}
      <Path path={pathingPath} color="#FBBF24" style="stroke" strokeWidth={3}>
        <DashPathEffect intervals={[10, 10]} />
      </Path>
    </>
  );

  return (
    <GestureDetector gesture={composedGestures}>
      <View style={styles.container}>
        <Canvas style={styles.canvas}>
          <Group transform={transform as any}>
            {/* Phantom Left Clone */}
            <Group transform={[{ translateX: -MAP_WIDTH }]}>
              {renderMapLayers()}
            </Group>
            
            {/* Center Real */}
            <Group>
              {renderMapLayers()}
            </Group>
            
            {/* Phantom Right Clone */}
            <Group transform={[{ translateX: MAP_WIDTH }]}>
              {renderMapLayers()}
            </Group>
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  canvas:    { flex: 1 },
});
