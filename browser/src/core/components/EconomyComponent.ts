export class EconomyComponent {
  gold: Float64Array;
  food: Float64Array;
  wood: Float64Array;
  iron: Float64Array;
  faith: Float64Array;
  legitimacy: Float64Array;

  constructor(maxEntities: number) {
    this.gold = new Float64Array(maxEntities);
    this.food = new Float64Array(maxEntities);
    this.wood = new Float64Array(maxEntities);
    this.iron = new Float64Array(maxEntities);
    this.faith = new Float64Array(maxEntities);
    this.legitimacy = new Float64Array(maxEntities);
  }
}

