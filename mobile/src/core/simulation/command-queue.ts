import type { EcsState } from "../models/game-state";

export const MAX_COMMANDS = 2048;

import { CommandType } from "../types/commands";

export function enqueueCommand(
  ecs: EcsState,
  type: CommandType,
  faction: number,
  arg0: number,
  arg1: number
): boolean {
  const nextTail = (ecs.cmdTail + 1) % MAX_COMMANDS;

  // Trava de overflow contra alcance no cmdHead
  if (nextTail === ecs.cmdHead) {
    return false; // Ignora o comando silenciosamente para proteger a engine
  }

  const tail = ecs.cmdTail;
  ecs.cmdType[tail] = type;
  ecs.cmdFaction[tail] = faction;
  ecs.cmdArg0[tail] = arg0;
  ecs.cmdArg1[tail] = arg1;

  // Operação atômica
  ecs.cmdTail = nextTail;
  return true;
}

