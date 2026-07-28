import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { GameSession } from '../application/game-session';
import { createStaticWorldData } from '../application/boot/static-world-data';
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from '../application/boot/generated/world-definitions-v1';
import { createInitialState } from '../application/boot/create-initial-state';
import { LocalEventBus } from '../infrastructure/runtime/local-event-bus';
import { UtilityNpcDecisionService } from '../infrastructure/npc/utility-npc-decision-service';
import { LocalDiplomacyResolver } from '../infrastructure/diplomacy/local-diplomacy-resolver';
import { LocalWarResolver } from '../infrastructure/war/local-war-resolver';
import { createDefaultSimulationSystems } from '../core/simulation/create-default-systems';
import { GameState } from '../core/models/game-state';
import { ClockService } from '../core/contracts/services';
import { AILogger } from '../infrastructure/telemetry/AILogger';


import { MobileGameStateRepository, MobileSaveRepository } from '../infrastructure/persistence/MobileGameStateRepository';
import { mmkvStorage } from './memory-persistence';
import { useUIStore } from './store/game-store';

class NativeClockService implements ClockService {
  private rAFId: number | null = null;
  private lastTickAt = 0;
  private listeners: ((deltaMs: number, now: number) => void)[] = [];

  start(onTick: (deltaMs: number, now: number) => void) {
    this.stop();
    this.lastTickAt = this.now();
    
    const loop = () => {
      const now = this.now();
      const deltaMs = Math.max(0, now - this.lastTickAt);
      this.lastTickAt = now;
      onTick(deltaMs, now);
      this.rAFId = requestAnimationFrame(loop);
    };
    
    this.rAFId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rAFId !== null) {
      cancelAnimationFrame(this.rAFId);
      this.rAFId = null;
    }
  }

  now(): number {
    return Date.now();
  }
}

interface GameContextData {
  gameState: GameState | null;
  session: GameSession | null;
  playerKingdomId: string;
  staticWorldData: any;
}

const GameContext = createContext<GameContextData>({
  gameState: null,
  session: null,
  playerKingdomId: "PLAYER_KINGDOM",
  staticWorldData: null,
});

export const useGameState = () => useContext(GameContext);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [staticWorldData] = useState(() => createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID));
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize Game Engine
    const eventBus = new LocalEventBus();
    const npcDecisionService = new UtilityNpcDecisionService(staticWorldData);
    const diplomacyResolver = new LocalDiplomacyResolver();
    const warResolver = new LocalWarResolver(staticWorldData);
    const clock = new NativeClockService();

    const newSession = new GameSession({
      gameStateRepository: new MobileGameStateRepository(mmkvStorage),
      saveRepository: new MobileSaveRepository(mmkvStorage) as any,
      staticWorldData,
      clock,
      eventBus,
      systems: createDefaultSimulationSystems({
        staticData: staticWorldData,
        orderedDefinitions: WORLD_DEFINITIONS_V1,
        npcDecisionService,
        diplomacyResolver,
        warResolver,
        eventBus
      }),
      diplomacyResolver,
      warResolver,
    });

    let syncInterval: any;

    const initGame = async () => {
      try {
        AILogger.init();
        
        // Start a new campaign for prototype
        const initialState = createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
        await newSession.bootstrap(initialState);

      // Since we run synchronously on mobile (no Web Worker yet), we instantly mark the worker as ready.
      newSession.markWorkerReady();

      // Force first state grab
      const startingState = newSession.getState();
      setGameState({ ...startingState });
      setSession(newSession);

      // Log the initial fully loaded state to the AI, then disable auto-log to save CPU
      AILogger.logStateDump(startingState, true).finally(() => {
        AILogger.disableAutoLog();
      });

      // Start engine tick
      newSession.start();

      // Filtro de Tick: Previne vazamento de referências e loops infinitos no React (Maximum update depth)
      let lastRenderedTick = -1;
      let lastEventsLength = -1;

      // Start UI sync bridge (4 FPS)
      syncInterval = setInterval(() => {
        const state = newSession.getState();
        if (state) {
          const pId = Object.keys(state.kingdoms).find(id => state.kingdoms[id].isPlayer) || "k_player";
          const k = state.kingdoms[pId];
          const e = k?.economy;
          if (e) {
          const t = e?.taxPolicy;
            // Ação A: Lê estoques reais do ECS via ponte pública (desacoplada do ECS diretamente)
            // e?.stock?.gold estava sempre zerado pois a engine migrou para TypedArrays
            let ecsStock = { gold: 0, food: 0, wood: 0, iron: 0, faith: 0, legitimacy: 0 } as any;
            try { ecsStock = newSession.getPlayerEcsStock(); } catch (_) {}
            useUIStore.setState({
              tick: state?.meta?.tick ?? 0,
              isPaused: state?.meta?.paused ?? false,
              playerGold: ecsStock.gold ?? 0,
              playerFood: ecsStock.food ?? 0,
              playerWood: ecsStock.wood ?? 0,
              playerIron: ecsStock.iron ?? 0,
              playerFaith: ecsStock.faith ?? 0,
              playerLegitimacy: ecsStock.legitimacy ?? 0,
              playerGoldIncome: e?.incomePerTick?.gold ?? 0,
              playerFoodIncome: e?.incomePerTick?.food ?? 0,
              playerWoodIncome: e?.incomePerTick?.wood ?? 0,
              playerIronIncome: e?.incomePerTick?.iron ?? 0,
              playerFaithIncome: e?.incomePerTick?.faith ?? 0,
              playerLegitimacyIncome: e?.incomePerTick?.legitimacy ?? 0,
              playerPopulation: k?.population?.total ?? 0,
              playerRegions: k?.ownedRegionIds?.length ?? 0,
              playerCorruption: e?.corruption ?? 0,
              playerInflation: e?.inflation ?? 0,
              playerTaxBaseRate: t?.baseRate ?? 0.2,
              playerTaxNobleRelief: t?.nobleRelief ?? 0.1,
              playerTaxClergyExemption: t?.clergyExemption ?? 0.08,
              playerTaxTariffRate: t?.tariffRate ?? 0.12,
              playerBudgetEconomy: e?.budgetPriority?.economy ?? 0,
              playerBudgetMilitary: e?.budgetPriority?.military ?? 0,
              playerBudgetReligion: e?.budgetPriority?.religion ?? 0,
              playerBudgetAdministration: e?.budgetPriority?.administration ?? 0,
              playerBudgetTechnology: e?.budgetPriority?.technology ?? 0,
              playerStability: Math.min(100, Math.max(0, (k as any)?.stats?.stability ?? 100)),
              ...(state.events.length !== lastEventsLength ? { worldFeed: state.events.filter(e => (e as any).severity === 'log' || (e as any).severity === 'info').slice(-20) } : {})
            });
            lastEventsLength = state.events.length;
            
            // Vacina Cirúrgica (Contexto):
            // Só avança a árvore de contexto lenta se o Tick realmente progrediu.
            // Removemos o `{...state}` para preservar a referência de clones saudáveis da Engine.
            if (state.meta.tick !== lastRenderedTick) {
                lastRenderedTick = state.meta.tick;
                setGameState(state);
            }
          }
        }
      }, 250);

      } catch (err) {
        console.error("Error bootstrapping game session:", err);
      }
    };

    initGame();

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        console.log('[GameProvider] App going to background. Forcing save to disk.');
        try {
          await newSession.triggerAutosave();
        } catch (error) {
          console.error('[GameProvider] Error in background triggerAutosave:', error);
        }
      }
    });

    return () => {
      subscription.remove();
      newSession.stop();
      if (syncInterval) clearInterval(syncInterval);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const activePlayerId = gameState
    ? Object.keys(gameState.kingdoms).find((id) => gameState.kingdoms[id].isPlayer) || "k_player"
    : "k_player";

  return (
    <GameContext.Provider value={{ 
      gameState, 
      session, 
      playerKingdomId: activePlayerId,
      staticWorldData 
    }}>
      {children}
    </GameContext.Provider>
  );
}

