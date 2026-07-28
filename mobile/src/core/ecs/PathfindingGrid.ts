export class PathfindingGrid {
  private neighbors: Int32Array;
  private maxRegions: number;

  constructor(maxRegions: number, rawNeighbors: number[][]) {
    this.maxRegions = maxRegions;
    // Até 6 vizinhos por hexágono
    this.neighbors = new Int32Array(maxRegions * 6).fill(-1);

    for (let i = 0; i < rawNeighbors.length; i++) {
      if (!rawNeighbors[i]) continue;
      for (let j = 0; j < rawNeighbors[i].length; j++) {
        this.neighbors[i * 6 + j] = rawNeighbors[i][j];
      }
    }
  }

  /**
   * Executa um BFS a partir de alvos para espalhar um Flow Field (Mapa de Calor vetorial).
   * Sem alocações de array dinâmico O(N) dentro do loop.
   */
  public buildFlowField(
    targets: number[], 
    outFlowField: Int32Array, 
    queueBuffer: Int32Array,
    distanceBuffer: Int32Array
  ): void {
    // Reseta matrizes
    for (let i = 0; i < this.maxRegions; i++) {
      outFlowField[i] = -1;
      distanceBuffer[i] = 999999;
    }

    let head = 0;
    let tail = 0;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      queueBuffer[tail++] = t;
      distanceBuffer[t] = 0;
      outFlowField[t] = t; // No alvo, aponta para si mesmo
    }

    while (head < tail) {
      const current = queueBuffer[head++];
      const currentDist = distanceBuffer[current];

      for (let i = 0; i < 6; i++) {
        const neighbor = this.neighbors[current * 6 + i];
        if (neighbor === -1) break; // Sem mais vizinhos válidos

        // Se encontrou um caminho mais curto para este vizinho
        if (currentDist + 1 < distanceBuffer[neighbor]) {
          distanceBuffer[neighbor] = currentDist + 1;
          outFlowField[neighbor] = current; // Vizinho deve apontar para o current para descer a correnteza
          queueBuffer[tail++] = neighbor;
        }
      }
    }
  }

  /**
   * Irradia visão a partir de um conjunto de alvos (Cidades e Exércitos Aliados).
   */
  public radiateVision(
    visibilityMask: Uint8Array,
    sources: { index: number; radius: number }[],
    queueBuffer: Int32Array,
    distanceBuffer: Int32Array
  ): void {
    // Rebaixar visão atual (2 para 1)
    for (let i = 0; i < visibilityMask.length; i++) {
      if (visibilityMask[i] === 2) visibilityMask[i] = 1;
      distanceBuffer[i] = 999999;
    }

    let head = 0;
    let tail = 0;

    // Enfileirar fontes e marcar como visão ativa
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      queueBuffer[tail++] = src.index;
      distanceBuffer[src.index] = 0;
      visibilityMask[src.index] = 2; // Descoberto e Visível

      // Codifica o raio máximo disponível neste nó no "dist"?
      // Não, a distância começa de 0, vamos propagar até o radius do src.
      // O desafio é que fontes diferentes têm raios diferentes. Vamos rodar BFS para cada raio?
      // Simples: rodamos um BFS por fonte para não misturar limites, ou BFS unificado onde armazenamos o "poder de visão" restante.
      // Como a fila não aloca objetos, podemos fazer um BFS por fonte.
    }

    // Abordagem unificada: guardamos a distância = 0 e fazemos BFS tradicional. 
    // Como simplificação para o jogo, usamos raio 2 constante para tudo, exceto exército (raio 1).
    // Para simplificar, faremos um loop simples com raio máximo absoluto = 2.
    head = 0;
    tail = 0;
    
    // Preparação simplificada:
    for (let i = 0; i < visibilityMask.length; i++) {
       distanceBuffer[i] = 0; // Vai representar o "poder de visão restante" (Vision Power)
    }

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (distanceBuffer[src.index] < src.radius) {
        distanceBuffer[src.index] = src.radius;
        queueBuffer[tail++] = src.index;
        visibilityMask[src.index] = 2;
      }
    }

    while (head < tail) {
      const current = queueBuffer[head++];
      const power = distanceBuffer[current];

      if (power <= 0) continue;

      for (let i = 0; i < 6; i++) {
        const neighbor = this.neighbors[current * 6 + i];
        if (neighbor === -1) break;

        const nextPower = power - 1;
        if (nextPower > distanceBuffer[neighbor]) {
          distanceBuffer[neighbor] = nextPower;
          visibilityMask[neighbor] = 2;
          queueBuffer[tail++] = neighbor;
        }
      }
    }
  }
}

