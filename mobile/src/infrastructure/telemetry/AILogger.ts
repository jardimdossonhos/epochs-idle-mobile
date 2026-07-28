import { GameState } from '../../core/models/game-state';
import { Platform } from 'react-native';

class AILoggerService {
  // Use 10.0.2.2 to reach the Windows host from Android emulator
  // Use localhost for iOS simulator or web
  private serverUrl = Platform.OS === 'android' ? 'http://10.0.2.2:9999' : 'http://localhost:9999';
  private autoLogEnabled = true; // Enabled during bootstrap
  private isServerOffline = false;
  
  public init() {
    // Intercept unhandled errors
    const globalAny = globalThis as any;
    const defaultHandler = globalAny.ErrorUtils?.getGlobalHandler();
    if (defaultHandler && globalAny.ErrorUtils) {
      globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
        this.logError(error, isFatal);
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }
  }

  public disableAutoLog() {
    this.autoLogEnabled = false;
  }

  public async logStateDump(state: GameState, isAutoLog = false) {
    if (isAutoLog && !this.autoLogEnabled) return;
    
    try {
      await fetch(this.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'STATE_DUMP', state })
      });
      this.isServerOffline = false;
    } catch (e) {
      if (!this.isServerOffline) {
        console.warn('[AILogger] Telemetry Server off. Further connection errors will be suppressed.');
        this.isServerOffline = true;
      }
    }
  }

  public async logEvent(payload: any) {
    if (!this.autoLogEnabled) return;
    try {
      await fetch(this.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'EVENT', payload })
      });
      this.isServerOffline = false;
    } catch (e) {
      if (!this.isServerOffline) {
        console.warn('[AILogger] Telemetry Server off. Further connection errors will be suppressed.');
        this.isServerOffline = true;
      }
    }
  }

  private async logError(error: any, isFatal: boolean) {
    try {
      await fetch(this.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'ERROR', 
          message: error?.message || 'Unknown Error',
          stack: error?.stack,
          isFatal
        })
      });
    } catch (e) {
      console.warn('[AILogger] Telemetry Server off: ', e);
    }
  }
}

let _aiLogger: AILoggerService | null = null;

// Lazy getter — evita crash Hermes por instanciação global em módulo com dependência circular
export const getAILogger = (): AILoggerService => {
  if (!_aiLogger) {
    _aiLogger = new AILoggerService();
  }
  return _aiLogger;
};

// Alias de retrocompatibilidade
export const AILogger = {
  init: () => getAILogger().init(),
  disableAutoLog: () => getAILogger().disableAutoLog(),
  logStateDump: (state: any, isAutoLog?: boolean) => getAILogger().logStateDump(state, isAutoLog),
  logEvent: (payload: any) => getAILogger().logEvent(payload),
};
