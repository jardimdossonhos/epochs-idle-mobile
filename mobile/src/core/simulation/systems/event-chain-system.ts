import { buildEvent } from "../../ecs/event-pool";
import type { SimulationSystem } from "../tick-pipeline";
import { createEventId, clamp, roundTo } from "./utils";
import { ResourceType } from "../../models/enums";
import type { EventChainState } from "../../models/world";

export function createEventChainSystem(): SimulationSystem {
  return {
    id: "event_chain",
    run(context): void {
      const state = context.nextState;
      let eventSeq = 0;
      const activeChains = state.world.eventChains ?? (state.world.eventChains = {});

      if (state.meta.tick % 5 !== 0) {
        return;
      }

      for (const kingdomId of Object.keys(state.kingdoms)) {
        const kingdom = state.kingdoms[kingdomId];
        const chainKey = `economic_crisis_${kingdomId}`;

        if (!activeChains[chainKey] && Math.random() < 0.005) {
          const chain: EventChainState = {
            id: chainKey,
            kingdomId,
            chainType: "economic_crisis",
            stage: 1,
            maxStages: 4,
            startedAt: state.meta.tick,
            lastTriggered: state.meta.tick,
            data: { initialCorruption: kingdom.economy.corruption }
          };
          activeChains[chainKey] = chain;

          kingdom.economy.corruption += 0.1;
          kingdom.population.growthRatePerTick = roundTo(
            clamp(kingdom.population.growthRatePerTick - 0.00005, 0.00001, 0.001),
            6
          );

          const evt = buildEvent("event_chain.economic_crisis", context.now, {
              stage: 1,
              impact: "inflation_start",
              chainId: chainKey
            }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_chain_economic_crisis_1", tick: context.nextState.meta.tick, systemId: "event_chain", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
        }
      }

      for (const [chainKey, chain] of Object.entries(activeChains)) {
        const kingdom = state.kingdoms[chain.kingdomId];
        if (!kingdom) {
          delete activeChains[chainKey];
          continue;
        }

        const ticksSinceLastTrigger = state.meta.tick - chain.lastTriggered;
        const shouldProgress = ticksSinceLastTrigger >= 20 + Math.random() * 30;

        if (shouldProgress && chain.stage < chain.maxStages) {
          chain.stage += 1;
          chain.lastTriggered = state.meta.tick;

          switch (chain.chainType) {
            case "economic_crisis":
              if (chain.stage === 2) {
                kingdom.economy.stock[ResourceType.Food] = Math.max(
                  0,
                  kingdom.economy.stock[ResourceType.Food] - 100
                );
                kingdom.population.unrest = roundTo(clamp(kingdom.population.unrest + 0.1, 0, 1));

                const evt = buildEvent("event_chain.economic_crisis", context.now, {
                    stage: 2,
                    impact: "food_shortage",
                    chainId: chainKey,
                    amount: 100
                  }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_chain_economic_crisis_2", tick: context.nextState.meta.tick, systemId: "event_chain", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
              } else if (chain.stage === 3) {
                kingdom.stability -= 10;
                kingdom.population.unrest += 0.2;

                const evt = buildEvent("event_chain.economic_crisis", context.now, {
                    stage: 3,
                    impact: "social_unrest",
                    chainId: chainKey
                  }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_chain_economic_crisis_3", tick: context.nextState.meta.tick, systemId: "event_chain", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
              } else if (chain.stage === 4) {
                if (Math.random() < 0.6) {
                  kingdom.economy.corruption = Math.max(0.05, kingdom.economy.corruption - 0.15);
                  kingdom.population.growthRatePerTick = roundTo(
                    clamp(kingdom.population.growthRatePerTick + 0.00005, 0.00001, 0.001),
                    6
                  );

                  const evt = buildEvent("event_chain.economic_crisis_resolved", context.now, {
                      stage: 4,
                      impact: "recovery",
                      chainId: chainKey
                    }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_chain_economic_crisis_resolved", tick: context.nextState.meta.tick, systemId: "event_chain", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
                } else {
                  kingdom.stability -= 20;
                  kingdom.legitimacy -= 15;

                  const evt = buildEvent("event_chain.economic_crisis_collapse", context.now, {
                      stage: 4,
                      impact: "collapse",
                      chainId: chainKey
                    }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_chain_economic_crisis_collapse", tick: context.nextState.meta.tick, systemId: "event_chain", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
                }

                delete activeChains[chainKey];
              }
              break;
            case "holy_war":
              if (chain.stage === 2) {
                kingdom.population.unrest = roundTo(clamp(kingdom.population.unrest + 0.05, 0, 1));
              } else if (chain.stage === 3) {
                delete activeChains[chainKey];
              }
              break;
          }
        }

        if (state.meta.tick - chain.startedAt > 200) {
          delete activeChains[chainKey];
        }
      }

      for (const kingdomId of Object.keys(state.kingdoms)) {
        const kingdom = state.kingdoms[kingdomId];
        const chainKey = `holy_war_${kingdomId}`;

        if (!activeChains[chainKey] && kingdom.religion.cohesion > 0.8 && Math.random() < 0.003) {
          const chain: EventChainState = {
            id: chainKey,
            kingdomId,
            chainType: "holy_war",
            stage: 1,
            maxStages: 3,
            startedAt: state.meta.tick,
            lastTriggered: state.meta.tick,
            data: {}
          };
          activeChains[chainKey] = chain;

          kingdom.religion.cohesion += 0.1;
          for (const army of kingdom.military.armies) {
            army.morale = roundTo(clamp(army.morale + 0.15, 0, 1));
          }

          const evt = buildEvent("event_chain.holy_war", context.now, {
              stage: 1,
              impact: "religious_zeal",
              chainId: chainKey
            }, kingdom.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_chain_holy_war_1", tick: context.nextState.meta.tick, systemId: "event_chain", actorId: kingdom.id, sequence: context.events.length });
            context.events.push(evt);
          }
        }
      }
    }
  };
}
