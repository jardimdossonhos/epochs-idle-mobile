export type DesktopStorageScope = "current-state" | "save-slots" | "command-log" | "state-snapshots";

export interface DesktopStorageListEntry {
  key: string;
  value: unknown;
}

export interface DesktopRuntimeInfo {
  isDesktop: true;
  appVersion: string;
  isPackaged: boolean;
  storageRoot: string;
}

export interface DesktopBridge {
  runtime: DesktopRuntimeInfo;
  storage: {
    read(scope: DesktopStorageScope, key: string): Promise<unknown | null>;
    write(scope: DesktopStorageScope, key: string, value: unknown): Promise<void>;
    delete(scope: DesktopStorageScope, key: string): Promise<void>;
    list(scope: DesktopStorageScope): Promise<DesktopStorageListEntry[]>;
    clear(scope: DesktopStorageScope): Promise<void>;
  };
}

declare global {
  interface Window {
    midkDesktop?: DesktopBridge;
  }
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.midkDesktop ?? null;
}

export function isDesktopRuntime(): boolean {
  return getDesktopBridge() !== null;
}
