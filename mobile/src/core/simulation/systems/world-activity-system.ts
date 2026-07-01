import type { SimulationSystem } from "../tick-pipeline";
import { createEventId } from "./utils";

interface ActivityCounter {
  warsStarted: number;
  peacesSigned: number;
  captures: number;
  diplomaticMoves: number;
}

function countActivity(events: readonly { type: string }[]): ActivityCounter {
  const counter: ActivityCounter = {
    warsStarted: 0,
    peacesSigned: 0,
    captures: 0,
    diplomaticMoves: 0
  };

  for (const event of events) {
    switch (event.type) {
      case "war.started":
        counter.warsStarted += 1;
        break;
      case "war.peace":
        counter.peacesSigned += 1;
        break;
      case "war.region_captured":
        counter.captures += 1;
        break;
      case "npc.decision":
        counter.diplomaticMoves += 1;
        break;
    }
  }

  return counter;
}

export function createWorldActivitySystem(): SimulationSystem {
  return {
    id: "world_activity",
    run(context): void {
      if (context.events.length === 0) {
        return;
      }

      const activity = countActivity(context.events);
      const total = activity.warsStarted + activity.peacesSigned + activity.captures;

      if (total === 0) {
        return;
      }

      if (total < 2 && context.nextState.meta.tick % 4 !== 0) {
        return;
      }

      context.events.push({
        id: createEventId({
          prefix: "evt_world_summary",
          tick: context.nextState.meta.tick,
          systemId: "world_activity",
          sequence: 0
        }),
        type: "world.activity_summary",
        payload: {
          warsStarted: activity.warsStarted,
          peacesSigned: activity.peacesSigned,
          captures: activity.captures,
          diplomaticMoves: activity.diplomaticMoves
        },
        occurredAt: context.now
      });
    }
  };
}
