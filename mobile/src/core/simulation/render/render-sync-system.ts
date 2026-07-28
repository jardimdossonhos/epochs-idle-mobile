import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { ArmyPool } from "../../ecs/army-pool";
import { MAX_REGIONS } from "../spatial/spatial-grid-system";

export const MAX_ARMIES = 2048;

export class RenderSyncSystem implements SimulationSystem {
  public readonly id = "render_sync";
  
  // Buffers Estáticos para Zero-Allocation
  private renderRegionOwner = new Int32Array(MAX_REGIONS);
  private renderArmyData = new Float32Array(MAX_ARMIES * 4);

  public run(context: TickContext): void {
    const state = context.nextState;
    if (!state.ecs) return;
    const ecs = state.ecs;

    // Passo A: Cópia O(1) ultrarrápida da malha de soberania
    // Blindagem: usa o mínimo entre origem e destino para evitar RangeError
    // quando o mock (tamanho 0) ou um mapa maior que MAX_REGIONS for carregado.
    const len = Math.min(ecs.regionOwner.length, this.renderRegionOwner.length);
    if (len > 0) {
      if ('subarray' in ecs.regionOwner) {
        this.renderRegionOwner.set((ecs.regionOwner as Int32Array).subarray(0, len));
      } else {
        this.renderRegionOwner.set((ecs.regionOwner as number[]).slice(0, len));
      }
    }

    // Passo B: Extração Topológica da Matriz Militar O(A)
    for (let i = 0; i < ArmyPool.instances.length; i++) {
      const army = ArmyPool.instances[i];
      const offset = i * 4;

      if (!army.isActive) {
        // Sinaliza ocultamento visual (Facção = -1)
        this.renderArmyData[offset + 0] = -1;
      } else {
        // Extrai índices puramente topológicos
        this.renderArmyData[offset + 0] = army.factionIndex;
        this.renderArmyData[offset + 1] = army.stationedIndex;
        this.renderArmyData[offset + 2] = army.targetIndex;
        this.renderArmyData[offset + 3] = army.manpower;
      }
    }

    // Passo C: Despache via PostMessage para a Main Thread (React Native)
    if (typeof self !== "undefined" && typeof (self as any).postMessage === "function") {
      (self as any).postMessage({
        type: "SYNC_TICK",
        payload: {
          regionOwner: this.renderRegionOwner,
          armyData: this.renderArmyData,
          mapUpdateTrigger: ecs.conquestEpoch,
          tickDurationMs: state.meta.tickDurationMs
        }
      });
    }
  }
}

