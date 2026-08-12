/**
 * MapScreen.tsx
 *
 * Conecta o SimulationCanvas (Skia) ao GameSession (ECS) sem usar o Web Worker,
 * que não é suportado em React Native bare workflow.
 *
 * Fluxo de dados:
 *   GameProvider (ECS) → useGameState() → ecsState.regionOwner (Int32Array)
 *                     → useSharedValue  → SimulationCanvas
 */
import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useSharedValue }   from 'react-native-reanimated';

import { SimulationCanvas, SimulationCanvasRef }  from '../components/map/simulation-canvas';
import { ImperialOverlay }   from '../components/map/imperial-overlay';
import { useGameState }      from '../GameProvider';
import { useUiStore }        from '../stores/use-ui-store';
import RegionDetailPanel     from '../components/RegionDetailPanel';

// ─── noop dispatch (combat commands disabled without the Worker engine) ────────
const NOOP_DISPATCH = (_cmd: [number, number, number, number]) => {};

export default function MapScreen() {
  const { gameState } = useGameState();
  const selectedHex   = useUiStore((s) => s.selectedHex);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const playerFactionId = useUiStore((s) => s.playerFactionId);
  
  const canvasRef = useRef<SimulationCanvasRef>(null);

  // Extrair a capital do jogador
  const playerKingdom = gameState?.kingdoms ? Object.values(gameState.kingdoms).find(k => k.isPlayer) : null;
  const playerCapitalRegionId = playerKingdom?.capitalRegionId;
  const capitalHexId = playerCapitalRegionId ? parseInt(playerCapitalRegionId.replace('r_hex_', ''), 10) : undefined;

  // SharedValues that feed the canvas
  const regionOwner          = useSharedValue<Int32Array>(new Int32Array(25000));
  const mapUpdateTrigger     = useSharedValue<number>(0);

  // Empty placeholders — no Worker, no live army/combat data yet
  const currentArmyData      = useSharedValue<Float32Array>(new Float32Array(2048 * 4).fill(-1));
  const lastArmyData         = useSharedValue<Float32Array>(new Float32Array(2048 * 4).fill(-1));
  const tickProgress         = useSharedValue<number>(1);
  const hexStructures        = useSharedValue<Int32Array>(new Int32Array(25000));
  const structureUpdateTrigger = useSharedValue<number>(0);

  // Throttling state for UI updates (max 4fps)
  const lastUpdateTs = React.useRef(0);
  const timeoutRef = React.useRef<any>(null);

  // Sync ECS state -> SharedValue whenever gameState changes (Throttled)
  useEffect(() => {
    const sync = () => {
      lastUpdateTs.current = Date.now();
      if (!gameState?.ecs?.regionOwner) return;

      const src = gameState.ecs.regionOwner;
      const dst = new Int32Array(25000);

      // regionOwner in ECS is indexed by numeric region id (r_hex_101 -> 101)
      if (src instanceof Int32Array || Array.isArray(src)) {
        const len = Math.min(src.length, dst.length);
        for (let i = 0; i < len; i++) dst[i] = (src as any)[i];
      }

      regionOwner.value = dst;
      mapUpdateTrigger.value += 1; // signal the canvas to re-render the ownership layer

      // Also sync hexStructures if available
      if (gameState.ecs.hexStructures) {
        const srcS = gameState.ecs.hexStructures;
        const dstS = new Int32Array(25000);
        const lenS = Math.min((srcS as any).length, dstS.length);
        for (let i = 0; i < lenS; i++) dstS[i] = (srcS as any)[i];
        hexStructures.value = dstS;
        structureUpdateTrigger.value += 1;
      }
    };

    const now = Date.now();
    const timeSinceLast = now - lastUpdateTs.current;
    
    if (timeSinceLast >= 250) {
      // Enough time passed, sync immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      sync();
    } else {
      // Too fast, schedule a trailing sync if not already scheduled
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          sync();
        }, 250 - timeSinceLast);
      }
    }
  }, [gameState]);

  return (
    <View style={styles.container}>

      {/* ── Map layer (full-bleed, behind TopHUD) ── */}
      <View style={styles.mapLayer}>
        <SimulationCanvas
          ref={canvasRef}
          regionOwner={regionOwner}
          currentArmyData={currentArmyData}
          lastArmyData={lastArmyData}
          mapUpdateTrigger={mapUpdateTrigger}
          tickProgress={tickProgress}
          hexStructures={hexStructures}
          structureUpdateTrigger={structureUpdateTrigger}
          dispatchCommand={NOOP_DISPATCH}
          playerFactionId={playerFactionId}
          capitalHexId={capitalHexId}
        />
      </View>

      {/* ── UI overlays (pointerEvents pass-through) ── */}
      <View style={styles.uiLayer} pointerEvents="box-none">
        <ImperialOverlay />

        {selectedHex && (
          <View style={styles.panelContainer} pointerEvents="box-none">
            <RegionDetailPanel
              regionId={`r_hex_${selectedHex.id}`}
              onClose={clearSelection}
              isMergedView={false}
            />
          </View>
        )}

        {/* ── Zoom Controls ── */}
        <View style={styles.zoomControlsContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.zoomBtn} onPress={() => canvasRef.current?.zoomIn()} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => canvasRef.current?.zoomOut()} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>-</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628', // ocean background — visible before tiles load
  },
  mapLayer: {
    ...StyleSheet.absoluteFill,
  },
  uiLayer: {
    ...StyleSheet.absoluteFill,
  },
  panelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 16,
    bottom: '40%', // positioned above the region panel
    flexDirection: 'column',
    gap: 12,
    zIndex: 90,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 25, 40, 0.85)',
    borderWidth: 1,
    borderColor: '#303660',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  zoomBtnText: {
    color: '#D4AF37',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 28,
  }
});
