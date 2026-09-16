import { createInitialState } from "../application/boot/create-initial-state";
import { createStaticWorldData } from "../application/boot/static-world-data";
import { WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID } from "../application/boot/generated/world-definitions-v1";
import { getRegionIndex } from "../core/simulation/systems/utils";

describe("Continent Spawn constraints", () => {
  const staticData = createStaticWorldData(WORLD_DEFINITIONS_V1, WORLD_DEFINITIONS_MAP_ID);

  function checkBounds(hexId: string, minRow: number, maxRow: number, minCol: number, maxCol: number) {
    const idx = getRegionIndex(hexId);
    const row = Math.floor(idx / 800);
    const col = idx % 800;
    expect(row).toBeGreaterThanOrEqual(minRow);
    expect(row).toBeLessThanOrEqual(maxRow);
    expect(col).toBeGreaterThanOrEqual(minCol);
    expect(col).toBeLessThanOrEqual(maxCol);
  }

  it("preferencia America nunca gera capital fora da regiao de America (e nunca polar)", () => {
    const state = createInitialState(staticData, "r_hex_10286", WORLD_DEFINITIONS_V1);
    const player = state.kingdoms["k_player"];
    checkBounds(player.capitalRegionId, 40, 330, 20, 340);
  });

  it("preferencia Europa nunca gera capital fora da Europa (e nunca polar)", () => {
    const state = createInitialState(staticData, "r_hex_38160", WORLD_DEFINITIONS_V1);
    const player = state.kingdoms["k_player"];
    checkBounds(player.capitalRegionId, 40, 130, 370, 490);
  });

  it("preferencia Africa nunca gera capital fora da Africa (e nunca polar)", () => {
    const state = createInitialState(staticData, "r_hex_30423", WORLD_DEFINITIONS_V1);
    const player = state.kingdoms["k_player"];
    checkBounds(player.capitalRegionId, 122, 280, 350, 520);
  });

  it("preferencia Asia nunca gera capital fora da Asia (e nunca polar)", () => {
    const state = createInitialState(staticData, "r_hex_32989", WORLD_DEFINITIONS_V1);
    const player = state.kingdoms["k_player"];
    checkBounds(player.capitalRegionId, 40, 230, 488, 799); // 799 eh maximo agora
  });

  it("capital sempre pertence ao player e eh habitavel", () => {
    const state = createInitialState(staticData, "r_hex_38160", WORLD_DEFINITIONS_V1);
    const player = state.kingdoms["k_player"];
    const capIdx = getRegionIndex(player.capitalRegionId);
    expect(state.ecs.regionOwner[capIdx]).toBe(1); // 1 = player faction
    expect(state.kingdoms["k_player"].capitalRegionId).toBe("r_hex_" + capIdx);
    expect(state.ecs.populationTotal[capIdx]).toBe(20);
  });
  
  it("Spawn aleatorio sem preferencia continua funcionando e evita polos", () => {
    const state = createInitialState(staticData, undefined, WORLD_DEFINITIONS_V1);
    const player = state.kingdoms["k_player"];
    checkBounds(player.capitalRegionId, 40, 330, 0, 799); // Evita polos
  });
});