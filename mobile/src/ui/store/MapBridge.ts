export type MapWorkletUpdater = (payload: Float32Array) => void;

class MapBridgeManager {
  private updater: MapWorkletUpdater | null = null;

  public setUpdater(updater: MapWorkletUpdater) {
    this.updater = updater;
  }

  public pushDeltas(payload: Float32Array) {
    if (this.updater && payload.length > 0) {
      this.updater(payload);
    }
  }
}

let _mapBridge: MapBridgeManager | null = null;

// Lazy getter — evita instanciação no escopo global (crash Hermes com dependência circular)
export const getMapBridge = (): MapBridgeManager => {
  if (!_mapBridge) {
    _mapBridge = new MapBridgeManager();
  }
  return _mapBridge;
};

// Alias de retrocompatibilidade — proxy que delega para o singleton lazy
export const MapBridge = {
  setUpdater: (updater: MapWorkletUpdater) => getMapBridge().setUpdater(updater),
  pushDeltas: (payload: Float32Array) => getMapBridge().pushDeltas(payload),
};


