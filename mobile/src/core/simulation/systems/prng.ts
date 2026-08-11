/**
 * Retorna uma função de PRNG (Mulberry32) inicializada com a semente fornecida.
 * A função retornada gera números pseudoaleatórios determinísticos entre 0 (inclusivo) e 1 (exclusivo).
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
