export class PopulationComponent {
  public readonly total: Float64Array;
  public readonly growthRate: Float64Array;

  constructor(size: number) {
    // Armazena a população total de cada entidade (região).
    this.total = new Float64Array(size);
    // Armazena a taxa de crescimento base de cada entidade.
    this.growthRate = new Float64Array(size);
  }
}