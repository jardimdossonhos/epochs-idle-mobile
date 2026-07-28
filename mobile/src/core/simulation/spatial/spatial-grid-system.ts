export const MAX_REGIONS = 2000;
export const MAX_ARMIES = 2048; // Teto rígido da ArmyPool corrigido conforme diretriz

export class SpatialGridSystem {
  public hexHead = new Int32Array(MAX_REGIONS).fill(-1);
  public armyNext = new Int32Array(MAX_ARMIES).fill(-1);

  public add(armyIndex: number, hexIndex: number) {
    if (armyIndex < 0 || armyIndex >= MAX_ARMIES || hexIndex < 0 || hexIndex >= MAX_REGIONS) return;
    
    // Lista encadeada: o próximo do novo exército aponta para a antiga cabeça
    this.armyNext[armyIndex] = this.hexHead[hexIndex];
    // A nova cabeça do hexágono passa a ser o novo exército
    this.hexHead[hexIndex] = armyIndex;
  }

  public remove(armyIndex: number, hexIndex: number) {
    if (armyIndex < 0 || armyIndex >= MAX_ARMIES || hexIndex < 0 || hexIndex >= MAX_REGIONS) return;
    
    let curr = this.hexHead[hexIndex];
    let prev = -1;

    while (curr !== -1) {
      if (curr === armyIndex) {
        if (prev === -1) {
          // Remoção da cabeça da lista
          this.hexHead[hexIndex] = this.armyNext[curr];
        } else {
          // Remoção no meio ou final da lista
          this.armyNext[prev] = this.armyNext[curr];
        }
        // Limpa o ponteiro do exército removido
        this.armyNext[curr] = -1;
        break;
      }
      prev = curr;
      curr = this.armyNext[curr];
    }
  }

  public moveArmy(armyIndex: number, fromHexIndex: number, toHexIndex: number) {
    if (fromHexIndex !== -1) {
      this.remove(armyIndex, fromHexIndex);
    }
    if (toHexIndex !== -1) {
      this.add(armyIndex, toHexIndex);
    }
  }
}
