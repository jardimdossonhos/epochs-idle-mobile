export class UrbanComponent {
  hexStructures: Int32Array;

  constructor(maxEntities: number) {
    this.hexStructures = new Int32Array(maxEntities).fill(0);
  }
}
