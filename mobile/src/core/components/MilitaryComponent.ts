export class MilitaryComponent {
  public readonly manpower: Float64Array;

  constructor(size: number) {
    // Armazena a quantidade de soldados (manpower) disponíveis em cada região.
    // Este valor é derivado da população total e modificado por tecnologias e políticas.
    this.manpower = new Float64Array(size);
  }
}