import type {
  CommandLogRepository,
  GameStateRepository,
  SaveRepository
} from "../../core/contracts/game-ports";
import {
  DesktopFileCommandLogRepository,
  DesktopFileGameStateRepository,
  DesktopFileSaveRepository
} from "./desktop-file-repositories";
import {
  IndexedDbCommandLogRepository,
  IndexedDbGameStateRepository,
  IndexedDbSaveRepository
} from "./indexeddb-repositories";
import { getDesktopBridge } from "../runtime/desktop-bridge";
import { WebFsGameStateRepository, WebFsSaveRepository } from "./web-fs-repositories";
import { 
  CapacitorPreferencesGameStateRepository, 
  CapacitorPreferencesSaveRepository 
} from "./capacitor-preferences-repositories";

export interface RuntimePersistenceBundle {
  mode: "desktop" | "browser";
  gameStateRepository: GameStateRepository;
  saveRepository: SaveRepository;
  commandLogRepository: CommandLogRepository;
  }

export function createRuntimePersistenceBundle(campaignId: string, fsDirHandle?: any): RuntimePersistenceBundle {
  const bridge = getDesktopBridge();

  if (bridge) {
    return {
      mode: "desktop",
      gameStateRepository: new DesktopFileGameStateRepository(bridge),
      saveRepository: new DesktopFileSaveRepository(bridge),
      commandLogRepository: new DesktopFileCommandLogRepository(bridge),
          };
  }

  // Capacitor (Native Android/iOS)
  const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform();
  if (isCapacitorNative) {
    return {
      mode: "browser",
      gameStateRepository: new CapacitorPreferencesGameStateRepository(campaignId),
      saveRepository: new CapacitorPreferencesSaveRepository(campaignId),
      commandLogRepository: new IndexedDbCommandLogRepository(campaignId), // Logs em idb para não estourar o Preferences // Snapshots em idb 
    };
  }

  // Solução 3 (Web File System API): Escrita profunda em HD Bypassando a Sandbox
  if (fsDirHandle) {
    return {
      mode: "browser",
      gameStateRepository: new WebFsGameStateRepository(fsDirHandle),
      saveRepository: new WebFsSaveRepository(fsDirHandle),
      commandLogRepository: new IndexedDbCommandLogRepository(campaignId), // Logs pesados continuam temporários no navegador
          };
  }

  // Fallback seguro: IndexedDB puro (Navegador)
  return {
    mode: "browser",
    gameStateRepository: new IndexedDbGameStateRepository(campaignId),
    saveRepository: new IndexedDbSaveRepository(campaignId),
    commandLogRepository: new IndexedDbCommandLogRepository(campaignId),
      };
}
