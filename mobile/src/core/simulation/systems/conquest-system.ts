import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { SpatialGridSystem, MAX_REGIONS } from "../spatial/spatial-grid-system";
import { ArmyPool } from "../../ecs/army-pool";

const CAPTURE_CONSTANT = 0.05;
const DECAY_RATE = 2.0;

export class ConquestSystem implements SimulationSystem {
  public readonly id = "conquest_system";
  private spatialGrid: SpatialGridSystem;
  
  // Array estático provisório de peso do terreno.
  // Será injetado ou lido globalmente quando a Malha Geográfica for totalmente acoplada.
  private terrainWeight = new Float32Array(MAX_REGIONS).fill(1.0);

  constructor(spatialGrid: SpatialGridSystem) {
    this.spatialGrid = spatialGrid;
  }

  public run(context: TickContext): void {
    const state = context.nextState;
    if (!state.ecs) return;

    const { regionOwner, regionCaptureProgress } = state.ecs;

    for (let i = 0; i < MAX_REGIONS; i++) {
      const head = this.spatialGrid.hexHead[i];

      if (head === -1) {
        // Hexágono Vazio: Decaimento Linear
        if (regionCaptureProgress[i] > 0) {
          regionCaptureProgress[i] = Math.max(0, regionCaptureProgress[i] - DECAY_RATE);
        }
        continue;
      }

      // Varredura de exércitos no hexágono O(K)
      let curr = head;
      let presentFaction = -1;
      let conflict = false;
      let totalInvaderManpower = 0;

      while (curr !== -1) {
        const army = ArmyPool.instances[curr];
        if (army.isActive && army.manpower > 0) {
          if (presentFaction === -1) {
            presentFaction = army.factionIndex;
          } else if (presentFaction !== army.factionIndex) {
            conflict = true;
            break;
          }
          
          if (army.factionIndex !== regionOwner[i]) {
            totalInvaderManpower += army.manpower;
          }
        }
        curr = this.spatialGrid.armyNext[curr];
      }

      if (conflict) {
        // Trava de Combate (ZoC Estrita): O sangue está correndo. Cerco congelado.
        continue;
      }

      // Existe apenas 1 facção dominante no hexágono físico
      if (presentFaction === regionOwner[i]) {
        // Aliados protegendo a própria terra: cerco invasor decai.
        if (regionCaptureProgress[i] > 0) {
          regionCaptureProgress[i] = Math.max(0, regionCaptureProgress[i] - DECAY_RATE);
        }
      } else {
        // Exército invasor solitário avança a captura
        if (totalInvaderManpower > 0) {
          const weight = this.terrainWeight[i] > 0 ? this.terrainWeight[i] : 1.0;
          const capture = (totalInvaderManpower * CAPTURE_CONSTANT) / weight;
          
          regionCaptureProgress[i] += capture;

          // Virada de Fronteira (Conquista Concluída)
          if (regionCaptureProgress[i] >= 100.0) {
            regionOwner[i] = presentFaction;
            regionCaptureProgress[i] = 0;
            // TODO: Aqui engataremos uma flag (Dirty Bit) de repintura do SVG/Frontend
          }
        }
      }
    }
  }
}

