export class World {
  private nextEntityId = 0;

  createEntity(): number {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    return id;
  }
}

