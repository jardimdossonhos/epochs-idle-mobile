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
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useSharedValue, runOnUI }   from 'react-native-reanimated';

import { SimulationCanvas, SimulationCanvasRef }  from '../components/map/simulation-canvas';
import { getRegionIndex } from '../../core/simulation/systems/utils';
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
  const mapLens = useUiStore((s) => s.mapLens);
  const setMapLens = useUiStore((s) => s.setMapLens);
  
  const canvasRef = useRef<SimulationCanvasRef>(null);
  const hasFocusedOnBoot = useRef(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Extrair a capital do jogador
  const playerKingdom = gameState?.kingdoms ? Object.values(gameState.kingdoms).find(k => k.isPlayer) : null;
  const playerCapitalRegionId = playerKingdom?.capitalRegionId;
  const capitalHexId = playerCapitalRegionId ? getRegionIndex(playerCapitalRegionId) : undefined;

  // SharedValues that feed the canvas
  const regionOwner          = useSharedValue<Int32Array>(new Int32Array(320000));
  const mapUpdateTrigger     = useSharedValue<number>(0);

  // Empty placeholders — no Worker, no live army/combat data yet
  const currentArmyData      = useSharedValue<Float32Array>(new Float32Array(2048 * 4).fill(-1));
  const lastArmyData         = useSharedValue<Float32Array>(new Float32Array(2048 * 4).fill(-1));
  const tickProgress         = useSharedValue<number>(1);
  const hexStructures        = useSharedValue<Int32Array>(new Int32Array(320000));
  const structureUpdateTrigger = useSharedValue<number>(0);

  // Throttling state for UI updates (max 4fps)
  const lastUpdateTs = React.useRef(0);
  const timeoutRef = React.useRef<any>(null);

  // Shadow cache no JS Heap para Diffing rápido (Alocado UMA VEZ no boot)
  const localRegionCache = useRef(new Int32Array(320000));
  const localStructuresCache = useRef(new Int32Array(320000));

  // Sync ECS state -> SharedValue whenever gameState changes (Throttled)
  useEffect(() => {
    // BLINDAGEM DE UNMOUNT (Anti-EGLConsumer Leak):
    // Se o componente for desmontado enquanto um sync estiver pendente via setTimeout,
    // o runOnUI tentaria escrever em uma C++ View já destruída, gerando o spam no Logcat:
    // "[SurfaceTexture...] updateAndRelease: EGLConsumer is not attached to an OpenGL ES context"
    // A flag isMounted e o clearTimeout no cleanup erradicam esse comportamento.
    let isMounted = true;

    const sync = () => {
      if (!isMounted) return;
      lastUpdateTs.current = Date.now();
      if (!gameState?.ecs?.regionOwner) return;

      const src = gameState.ecs.regionOwner;
      const cache = localRegionCache.current;
      const deltas: number[] = [];

      const len = Math.min(src.length, cache.length);
      // Fast JS-side Diffing
      for (let i = 0; i < len; i++) {
        const val = (src as any)[i];
        if (cache[i] !== val) {
          cache[i] = val;
          deltas.push(i, val);
        }
      }

      if (deltas.length > 0) {
        runOnUI((updates: number[], sv: any, trigger: any) => {
          'worklet';
          for (let i = 0; i < updates.length; i += 2) {
            sv.value[updates[i]] = updates[i+1];
          }
          trigger.value += 1;
        })(deltas, regionOwner, mapUpdateTrigger);
      }

      // Also sync hexStructures if available using the same Delta approach
      if (gameState.ecs.hexStructures) {
        const srcS = gameState.ecs.hexStructures;
        const cacheS = localStructuresCache.current;
        const deltasS: number[] = [];

        const lenS = Math.min((srcS as any).length, cacheS.length);
        for (let i = 0; i < lenS; i++) {
          const val = (srcS as any)[i];
          if (cacheS[i] !== val) {
            cacheS[i] = val;
            deltasS.push(i, val);
          }
        }

        if (deltasS.length > 0) {
          runOnUI((updates: number[], sv: any, trigger: any) => {
            'worklet';
            for (let i = 0; i < updates.length; i += 2) {
              sv.value[updates[i]] = updates[i+1];
            }
            trigger.value += 1;
          })(deltasS, hexStructures, structureUpdateTrigger);
        }
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

    return () => {
      // Cancela qualquer sync pendente e sinaliza desmonte para que o callback
      // não tente escrever em SharedValues de um Canvas EGL já destruído.
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [gameState]);

  // Câmera reativa: Só foca se a tela estiver com as dimensões prontas E a capital existir no ECS
  useEffect(() => {
    if (isCanvasReady && !hasFocusedOnBoot.current && capitalHexId !== undefined && canvasRef.current) {
      const col = capitalHexId % 800;
      const row = Math.floor(capitalHexId / 800);
      canvasRef.current.focusOnCapital(col, row, 2.0);
      hasFocusedOnBoot.current = true;
    }
  }, [isCanvasReady, capitalHexId]);

  const onMapLayout = useCallback(() => {
    setIsCanvasReady(true);
  }, []);

  return (
    <View style={styles.container}>

      {/* ── Map layer (full-bleed, behind TopHUD) ── */}
      <View style={styles.mapLayer} onLayout={onMapLayout}>
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

        {/* ── Painel Modal Focado (Scrim + Centralização) ── */}
        {selectedHex && (
          <View style={styles.modalOverlay} pointerEvents="auto">
            <TouchableOpacity 
              style={styles.scrim} 
              activeOpacity={1} 
              onPress={clearSelection} 
            />
            <View style={styles.centeredPanel}>
              <RegionDetailPanel
                regionId={`r_hex_${selectedHex.id}`}
                onClose={clearSelection}
                isMergedView={false}
              />
            </View>
          </View>
        )}

        {/* ── Lens Controls (Top Right) ── */}
        <View style={styles.lensControlsContainer} pointerEvents="box-none">
          <TouchableOpacity 
            style={[styles.lensBtn, mapLens === 'PHYSICAL' && styles.lensBtnActive]} 
            onPress={() => setMapLens('PHYSICAL')}
            activeOpacity={0.7}
          >
            <Text style={styles.lensBtnText}>🌍</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.lensBtn, mapLens === 'POLITICAL' && styles.lensBtnActive]} 
            onPress={() => setMapLens('POLITICAL')}
            activeOpacity={0.7}
          >
            <Text style={styles.lensBtnText}>👑</Text>
          </TouchableOpacity>
        </View>

        {/* ── Zoom Controls & Home ── */}
        <View style={styles.zoomControlsContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.zoomBtn} onPress={() => canvasRef.current?.zoomIn()} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => canvasRef.current?.zoomOut()} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => {
            if (capitalHexId !== undefined) {
              const col = capitalHexId % 800;
              const row = Math.floor(capitalHexId / 800);
              canvasRef.current?.focusOnCapital(col, row);
            }
          }} activeOpacity={0.7}>
            <Text style={styles.zoomBtnText}>🎯</Text>
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
  modalOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  scrim: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  centeredPanel: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%', // ensures it doesn't spill over the screen vertically
    borderRadius: 12,
    overflow: 'hidden',
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 16,
    bottom: '40%', // positioned above the region panel
    flexDirection: 'column',
    gap: 12,
    zIndex: 90,
  },
  lensControlsContainer: {
    position: 'absolute',
    left: 16,
    bottom: '40%',
    flexDirection: 'column',
    gap: 12,
    zIndex: 90,
  },
  lensBtn: {
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
  lensBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
  },
  lensBtnText: {
    fontSize: 20,
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
