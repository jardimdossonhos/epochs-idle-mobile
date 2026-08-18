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
import { getRegionIndex } from '../core/simulation/systems/utils';
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

        const initialState = createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
        await newSession.bootstrap(initialState);

        // Since we run synchronously on mobile (no Web Worker yet), we instantly mark the worker as ready.
        newSession.markWorkerReady();

        // ── HYDRATION GATE (TURNO ZERO) ───────────────────────────────────────────────────
        // Antes de qualquer tick, aterramos o lastUpdatedAt para Date.now().
        // Isso garante que o clock não veja nenhuma dívida de tempo entre o
        // momento em que o save foi gerado e o boot atual. Sem isso, o delta do
        // primeiro frame contém o tempo de carregamento inteiro, disparando o
        // Spiral of Death no processClockTick.
        const bootNow = clock.now();
        const s0 = newSession.getState();
        if (s0) {
          s0.meta.lastUpdatedAt = bootNow;
        }
        if (newSession.getState()?.meta.tick === 0) {
          const s = newSession.getState();
          const wasPaused = s.meta.paused;
          s.meta.paused = false;
          // Avança exatamente um tick para preencher agregações de População,
          // Territórios e Recursos antes de mostrar qualquer coisa na UI.
          // Como justUnpaused=true neste ponto, o clock descarta o primeiro
          // delta real — por isso usamos advanceTimeForTesting (forcândo ignorePause).
          newSession.advanceTimeForTesting(s.meta.tickDurationMs);
          s.meta.paused = wasPaused;
        }

        // Force first state grab (now fully hydrated with Turn 0 aggregates)
        const startingState = newSession.getState();
        setGameState({ ...startingState });
        setSession(newSession);

        // --- TEMPORARY AUDIT INSTRUMENTATION ---
        let ticksLogged = 0;
        const auditTimer = setInterval(() => {
          const s = newSession.getState();
          const activeKingdomId = Object.keys(s.kingdoms).find(id => s.kingdoms[id].isPlayer) || "k_player";
          const pk = s.kingdoms[activeKingdomId];
          const capId = pk?.capitalRegionId;
          const ecsStock = newSession.getPlayerEcsStock();
          
          let ownerId = null;
          if (capId) {
            const index = getRegionIndex(capId);
            ownerId = (index !== -1 && s.ecs) ? s.ecs.regionOwner[index] : null;
          }

          console.log(`[AUDIT] ${ticksLogged}s | PlayerId: ${activeKingdomId} | Capital: ${capId} | OwnerOfCapital: ${ownerId} | Gold: ${ecsStock.gold.toFixed(2)} | Income: ${pk?.economy?.netIncomePerTick?.gold?.toFixed(2)} | Tick: ${s.meta.tick}`);
          
          ticksLogged++;
          if (ticksLogged >= 5) clearInterval(auditTimer);
        }, 1000);
        // ----------------------------------------

        // ── SYNC SÍNCRONO DO HUD (Corrige "Piscar para zero") ──
        const pId = Object.keys(startingState.kingdoms).find(id => startingState.kingdoms[id].isPlayer) || "k_player";
        const pk = startingState.kingdoms[pId];
        const pe = pk?.economy;
        let ecsStock = { gold: 0, food: 0, wood: 0, iron: 0, faith: 0, legitimacy: 0 } as any;
        try { ecsStock = newSession.getPlayerEcsStock(); } catch (_) {}
        useUIStore.setState({
          tick: startingState.meta?.tick ?? 0,
          isPaused: startingState.meta?.paused ?? false,
          playerGold: ecsStock.gold ?? 0,
          playerFood: ecsStock.food ?? 0,
          playerWood: ecsStock.wood ?? 0,
          playerIron: ecsStock.iron ?? 0,
          playerFaith: ecsStock.faith ?? 0,
          playerLegitimacy: ecsStock.legitimacy ?? 0,
          playerGoldIncome: pe?.netIncomePerTick?.gold ?? 0,
          playerFoodIncome: pe?.netIncomePerTick?.food ?? 0,
          playerWoodIncome: pe?.netIncomePerTick?.wood ?? 0,
          playerIronIncome: pe?.netIncomePerTick?.iron ?? 0,
          playerFaithIncome: pe?.netIncomePerTick?.faith ?? 0,
          playerLegitimacyIncome: pe?.netIncomePerTick?.legitimacy ?? 0,
          playerPopulation: Math.floor(startingState?.ecs?.factionPopulation?.[1] ?? pk?.population?.total ?? 0),
          playerRegions: Math.floor(startingState?.ecs?.factionRegions?.[1] ?? pk?.ownedRegionIds?.length ?? 0)
        });

        // ── State Summarizer: payload leve com escalares O(1) ───────────
        // Nunca passar TypedArrays para JSON.stringify (OOM em 320k entidades).
        // Apenas escalares do KingdomState e buffers de facção agregados pelo ECS.
        const pKingdomId = Object.keys(startingState.kingdoms).find(
          id => startingState.kingdoms[id].isPlayer
        ) ?? 'k_player';
        const pKingdom = startingState.kingdoms[pKingdomId];
        const telemetryPayload = {
          tick:           startingState.meta?.tick       ?? 0,
          totalKingdoms:  Object.keys(startingState.kingdoms).length,
          ecsAggregates: {
            totalEntities:     startingState.ecs?.regionOwner?.length    ?? 0,
            // Faction index 1 = player faction
            population:        startingState.ecs?.factionPopulation?.[1] ?? 0,
            regions:           startingState.ecs?.factionRegions?.[1]    ?? 0,
            popGrowth:         startingState.ecs?.factionPopulationGrowth?.[1] ?? 0,
            popUnrest:         startingState.ecs?.factionPopUnrest?.[1]  ?? 0,
            peasants:          startingState.ecs?.factionPeasants?.[1]   ?? 0,
            nobles:            startingState.ecs?.factionNobles?.[1]     ?? 0,
            clergy:            startingState.ecs?.factionClergy?.[1]     ?? 0,
            soldiers:          startingState.ecs?.factionSoldiers?.[1]   ?? 0,
            merchants:         startingState.ecs?.factionMerchants?.[1]  ?? 0,
          },
          kingdom: pKingdom ? {
            id:             pKingdom.id,
            name:           pKingdom.name,
            stability:      pKingdom.stability,
            legitimacy:     pKingdom.legitimacy,
            population:     pKingdom.population?.total ?? 0,
            growthRate:     pKingdom.population?.growthRatePerTick ?? 0,
            adminCapacity:  pKingdom.administration?.adminCapacity ?? 0,
            usedCapacity:   pKingdom.administration?.usedCapacity  ?? 0,
            corruption:     pKingdom.administration?.corruption    ?? 0,
          } : null,
        };
        AILogger.logStateDump(telemetryPayload as any, true).finally(() => {
          AILogger.disableAutoLog();
        });

        // Start engine tick
        newSession.start();

        // Filtro de Tick: Previne vazamento de referências e loops infinitos no React (Maximum update depth)
        let lastRenderedTick = -1;
        let lastEventsLength = -1;
        let lastTopEventId = '';


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

            const currentTopEventId = state.events[0]?.id || '';
            const shouldUpdateFeed = state.events.length !== lastEventsLength || currentTopEventId !== lastTopEventId;

            const nextTick = state?.meta?.tick ?? 0;
            const nextPaused = state?.meta?.paused ?? false;
            const nextAscended = Boolean(k?.hasAscended);
            const nextEligible = !k?.hasAscended && (k?.population?.total ?? 0) >= 1000 && nextTick >= 12 && Boolean(k?.technology?.unlocked?.['sedentism']);
            const nextPostponed = Boolean(k?.ascensionPostponed);

            const currStore = useUIStore.getState();
            const nextUnlockedTechs = k?.technology?.unlocked ? Object.keys(k.technology.unlocked) : [];
            const techsChanged =
              currStore.playerUnlockedTechs.length !== nextUnlockedTechs.length ||
              !currStore.playerUnlockedTechs.every((val, idx) => val === nextUnlockedTechs[idx]);

            const shouldUpdateStore =
              currStore.tick !== nextTick ||
              currStore.isPaused !== nextPaused ||
              shouldUpdateFeed ||
              Math.abs(currStore.playerGold - (ecsStock.gold ?? 0)) > 0.01 ||
              currStore.playerHasAscended !== nextAscended ||
              currStore.playerAscensionEligible !== nextEligible ||
              currStore.playerAscensionPostponed !== nextPostponed ||
              techsChanged;

            if (shouldUpdateStore) {
              const stableTechs = techsChanged ? nextUnlockedTechs : currStore.playerUnlockedTechs;
              requestAnimationFrame(() => {
                useUIStore.setState({
                  tick: nextTick,
                  isPaused: nextPaused,
                  playerGold: ecsStock.gold ?? 0,
                  playerFood: ecsStock.food ?? 0,
                  playerWood: ecsStock.wood ?? 0,
                  playerIron: ecsStock.iron ?? 0,
                  playerFaith: ecsStock.faith ?? 0,
                  playerLegitimacy: ecsStock.legitimacy ?? 0,
                  playerGoldIncome: e?.netIncomePerTick?.gold ?? 0,
                  playerFoodIncome: e?.netIncomePerTick?.food ?? 0,
                  playerWoodIncome: e?.netIncomePerTick?.wood ?? 0,
                  playerIronIncome: e?.netIncomePerTick?.iron ?? 0,
                  playerFaithIncome: e?.netIncomePerTick?.faith ?? 0,
                  playerLegitimacyIncome: e?.netIncomePerTick?.legitimacy ?? 0,
                  playerPopulation: Math.floor(state?.ecs?.factionPopulation?.[1] ?? k?.population?.total ?? 0),
                  playerRegions: Math.floor(state?.ecs?.factionRegions?.[1] ?? k?.ownedRegionIds?.length ?? 0),
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
                  playerStability: Math.min(100, Math.max(0, (k as any)?.stability ?? 100)),
                  speedMultiplier: state?.meta?.speedMultiplier ?? 1,
                  playerUnlockedTechs: stableTechs,
                  playerHasAscended: nextAscended,
                  playerAscensionEligible: nextEligible,
                  playerAscensionPostponed: nextPostponed,
                  // ── Demographic modal data (O(1) reads from ECS Piggybacking) ──
                  playerPopulationGrowth: state?.ecs?.factionPopulationGrowth?.[1] ?? 0,
                  playerPopPeasants:   state?.ecs?.factionPeasants?.[1]   ?? 0,
                  playerPopNobles:     state?.ecs?.factionNobles?.[1]     ?? 0,
                  playerPopClergy:     state?.ecs?.factionClergy?.[1]     ?? 0,
                  playerPopSoldiers:   state?.ecs?.factionSoldiers?.[1]   ?? 0,
                  playerPopMerchants:  state?.ecs?.factionMerchants?.[1]  ?? 0,
                  playerPopUnrest:     state?.ecs?.factionPopUnrest?.[1]  ?? 0,
                  // ── Territory modal data (O(1) reads from KingdomState — no loops) ──
                  playerAdminCapacity:     k?.administration?.adminCapacity     ?? 0,
                  playerUsedAdminCapacity: k?.administration?.usedCapacity      ?? 0,
                  ...(shouldUpdateFeed ? { worldFeed: state.events.slice(-100) } : {})
                });
              });
            }

            if (shouldUpdateFeed) {
              lastEventsLength = state.events.length;
              lastTopEventId = currentTopEventId;
            }
            
            // Vacina Cirúrgica (Contexto):
            // Só avança a árvore de contexto lenta se o Tick realmente progrediu.
            // Removemos o `{...state}` para preservar a referência de clones saudáveis da Engine.
            if (state.meta.tick !== lastRenderedTick) {
                lastRenderedTick = state.meta.tick;
                requestAnimationFrame(() => {
                  setGameState(state);
                });
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
      } else if (nextAppState === 'active') {
        console.log('[GameProvider] App returning to active. Computing offline progression.');
        try {
          await newSession.resumeFromBackground();
        } catch (error) {
          console.error('[GameProvider] Error in resumeFromBackground:', error);
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

