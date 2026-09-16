export interface Poolable {
  _poolIdx: number;
  generation: number;
  isActive: boolean;
}

export interface PoolReference {
  index: number;
  generation: number;
}

/**
 * Padrão Object Pool Genérico de Zero-Alocação.
 * Sustenta um teto rígido de instâncias pré-alocadas na memória.
 */
export class ObjectPool<T extends Poolable> {
  public instances: T[];
  private maxSize: number;
  private pointer: number = 0;

  constructor(factory: (index: number) => T, maxSize: number) {
    this.maxSize = maxSize;
    this.instances = new Array(maxSize);
    for (let i = 0; i < maxSize; i++) {
      const item = factory(i);
      item._poolIdx = i;
      item.generation = 0;
      item.isActive = false;
      this.instances[i] = item;
    }
  }

  /**
   * Requisita um objeto inativo da pool O(1).
   * Não aloca nova memória (Evita Garbage Collection).
   */
  public acquire(): T | null {
    // Busca O(1) iterativa com pointer circular
    for (let i = 0; i < this.maxSize; i++) {
      const index = (this.pointer + i) % this.maxSize;
      if (!this.instances[index].isActive) {
        this.instances[index].isActive = true;
        this.instances[index].generation += 1;
        this.pointer = (index + 1) % this.maxSize;
        return this.instances[index];
      }
    }
    console.warn("[ObjectPool] Teto rígido de " + this.maxSize + " instâncias atingido! Ignorando nova criação para prevenir OOM.");
    return null;
  }

  /**
   * Libera o objeto para reciclagem imediata.
   */
  public release(item: T): void {
    item.isActive = false;
  }

  /**
   * Retorna apenas os objetos vivos.
   * CUIDADO: Usar filter aloca arrays novos, usar iteração direta nos sistemas ECS.
   */
  public getActive(): T[] {
    return this.instances.filter(i => i.isActive);
  }

  /**
   * Valida se uma referência (index + generation) ainda é válida e aponta para o mesmo objeto instanciado,
   * evitando acessar dados velhos após reciclagem.
   */
  public resolve(ref: PoolReference): T | null {
    const item = this.instances[ref.index];
    if (item && item.isActive && item.generation === ref.generation) {
      return item;
    }
    return null;
  }
}

