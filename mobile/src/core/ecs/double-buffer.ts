import { NitroModules } from 'react-native-nitro-modules';
import { MapBuffer } from 'react-native-map-buffer';

/**
 * Arquitetura de Double Buffering com C++ Nitro Modules (Zero-Copy).
 * Permite que um Worker escreva no Back Buffer enquanto a UI lê o Front Buffer.
 */
export class MapDoubleBuffer {
  private readonly nitroBuffer: MapBuffer;
  public readonly bufferA: Float32Array;
  public readonly bufferB: Float32Array;

  constructor(regionCount: number) {
    this.nitroBuffer = NitroModules.createHybridObject<MapBuffer>('MapBuffer');
    
    // Aloca a memória física via C++ (regionCount * 3 atributos)
    this.nitroBuffer.initialize(regionCount);
    
    // Recupera a referência Zero-Copy para o JS (Wrapping em Float32Array)
    this.bufferA = new Float32Array(this.nitroBuffer.getBufferA());
    this.bufferB = new Float32Array(this.nitroBuffer.getBufferB());
  }

  // ==========================================
  // METÓDOS DO WORKER (BACKGROUND THREAD)
  // ==========================================
  
  public getBackBuffer(): Float32Array {
    const front = this.nitroBuffer.getFrontIndex();
    return front === 0 ? this.bufferB : this.bufferA;
  }

  public commitBackBuffer(): void {
    // Registra a intenção de swap no C++
    this.nitroBuffer.commitBackBuffer();
  }

  // ==========================================
  // METÓDOS DA UI THREAD (SKIA / REANIMATED)
  // ==========================================

  public attemptSwap(): boolean {
    // Tenta trocar atômicamente no C++ e retorna se a UI precisa se atualizar
    return this.nitroBuffer.attemptSwap();
  }

  public getFrontBuffer(): Float32Array {
    const front = this.nitroBuffer.getFrontIndex();
    return front === 0 ? this.bufferA : this.bufferB;
  }
}
