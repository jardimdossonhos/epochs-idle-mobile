import { useEffect, useRef } from 'react';
import { mmkvStorage } from '../memory-persistence';
import { useSharedValue, withTiming, cancelAnimation, Easing, type SharedValue } from 'react-native-reanimated';
import { useUiStore } from '../stores/use-ui-store';
import { fetchImperialAdvice } from '../../core/services/llm-service';

export interface GameEngineState {
  regionOwner: SharedValue<Int32Array>;
  currentArmyData: SharedValue<Float32Array>;
  lastArmyData: SharedValue<Float32Array>;
  mapUpdateTrigger: SharedValue<number>;
  tickProgress: SharedValue<number>;
  hexStructures: SharedValue<Int32Array>;
  structureUpdateTrigger: SharedValue<number>;
  visibilityMask: SharedValue<Uint8Array>;
  visionUpdateTrigger: SharedValue<number>;
  combatEventHead: SharedValue<number>;
  combatEventX: SharedValue<Float32Array>;
  combatEventY: SharedValue<Float32Array>;
  combatEventTs: SharedValue<Float32Array>;
  startEngine: () => void;
  stopEngine: () => void;
  dispatchCommand: (cmd: [number, number, number, number]) => void;
}

export function useGameEngine(): GameEngineState {
  const regionOwner = useSharedValue<Int32Array>(new Int32Array(2000));
  
  const currentArmyData = useSharedValue<Float32Array>(new Float32Array(2048 * 4).fill(-1));
  const lastArmyData = useSharedValue<Float32Array>(new Float32Array(2048 * 4).fill(-1));
  
  const mapUpdateTrigger = useSharedValue<number>(0);
  const tickProgress = useSharedValue<number>(1);
  const hexStructures = useSharedValue<Int32Array>(new Int32Array(2000));
  const structureUpdateTrigger = useSharedValue<number>(0);
  const visibilityMask = useSharedValue<Uint8Array>(new Uint8Array(2000));
  const visionUpdateTrigger = useSharedValue<number>(0);
  const combatEventHead = useSharedValue<number>(0);
  const combatEventX = useSharedValue<Float32Array>(new Float32Array(1024));
  const combatEventY = useSharedValue<Float32Array>(new Float32Array(1024));
  const combatEventTs = useSharedValue<Float32Array>(new Float32Array(1024));
  
  const workerRef = useRef<Worker | null>(null);

  const startEngine = () => {
    if (workerRef.current) return;

    const worker = new Worker(new URL('../../infrastructure/worker/simulation.worker.ts', import.meta.url));

    const initDataStr = mmkvStorage.getString('init_payload');
    if (initDataStr) {
       // Carregamento de Save Game
       const parsedSave = JSON.parse(initDataStr);
       worker.postMessage({ type: 'INIT_LOAD', payload: parsedSave });
       
       // Sincroniza o macroHistory do Zustand
       if (parsedSave.macroHistory) {
         useUiStore.getState().macroHistory = parsedSave.macroHistory;
       }
    } else {
       // Novo Jogo Padrão
       // Gera os dados de mundo mockados para o worker
       const waterData = new Uint8Array(2000);
       const biomeData = new Uint8Array(2000);
       worker.postMessage({ type: 'INIT', payload: { entityCount: 2000, isWaterData: waterData, biomeData: biomeData } });
    }

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'SYNC_TICK' && data.payload) {
        
        if (data.payload.regionOwner) {
          regionOwner.value = data.payload.regionOwner;
        }

        if (data.payload.mapUpdateTrigger !== undefined) {
          mapUpdateTrigger.value = data.payload.mapUpdateTrigger;
        }

        if (data.payload.factionResources) {
          const store = useUiStore.getState();
          const p = store.playerFactionId;
          const offset = p * 3;
          store.setTreasury(
            data.payload.factionResources[offset + 0],
            data.payload.factionResources[offset + 1],
            data.payload.factionResources[offset + 2]
          );
        }

        if (data.payload.hexStructures) {
          hexStructures.value = data.payload.hexStructures;
        }
        


        if (data.payload.llmPayload) {
          const store = useUiStore.getState();
          const p = data.payload.llmPayload;
          
          if (store.isAiEnabled) {
             // Chamada a Nuvem
             fetchImperialAdvice(p.snapshot, store.macroHistory, p.chronicle)
             .then(res => {
                store.addImperialDispatch(res.advice, res.epoch_summary);
             })
             .catch(err => {
                // Fallback Silencioso: Diário Militar em caso de Timeout ou Erro no Proxy
                const rawLog = p.chronicle.join('\n');
                store.addImperialDispatch("[Fallback Local] " + rawLog);
             });
          } else {
             // Fallback Graceful Degradation
             const rawLog = p.chronicle.join('\n');
             store.addImperialDispatch(rawLog);
          }
        }

        if (data.payload.structureUpdateTrigger !== undefined) {
          structureUpdateTrigger.value = data.payload.structureUpdateTrigger;
        }

        if (data.payload.combatEventHead !== undefined) {
          combatEventHead.value = data.payload.combatEventHead;
          if (data.payload.combatEventX) combatEventX.value = data.payload.combatEventX;
          if (data.payload.combatEventY) combatEventY.value = data.payload.combatEventY;
          if (data.payload.combatEventTs) combatEventTs.value = data.payload.combatEventTs;
        }

        if (data.payload.armyData) {
          lastArmyData.value = currentArmyData.value;
          currentArmyData.value = data.payload.armyData;
          
          // Reconciliação do Estado Otimista
          const store = useUiStore.getState();
          for (const [armyIdxStr, targetId] of Object.entries(store.pendingMoves)) {
            const armyIndex = parseInt(armyIdxStr, 10);
            const offset = armyIndex * 4;
            // Verifica se o currentArmyData já reflete a intenção
            if (currentArmyData.value[offset + 2] === targetId) {
              store.removePendingMove(armyIndex);
            }
          }
          
          cancelAnimation(tickProgress);
          tickProgress.value = 0;
          const duration = data.payload.tickDurationMs || 10000;
          tickProgress.value = withTiming(1, { duration, easing: Easing.linear });
        }
      }
    };

    workerRef.current = worker;
  };

  const stopEngine = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  const dispatchCommand = (cmd: [number, number, number, number]) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'DISPATCH_COMMAND', payload: cmd });
    }
  };

  useEffect(() => {
    return () => {
      stopEngine();
    };
  }, []);

  return {
    regionOwner,
    currentArmyData,
    lastArmyData,
    mapUpdateTrigger,
    tickProgress,
    hexStructures,
    structureUpdateTrigger,
    visibilityMask,
    visionUpdateTrigger,
    combatEventHead,
    combatEventX,
    combatEventY,
    combatEventTs,
    startEngine,
    stopEngine,
    dispatchCommand
  };
}






