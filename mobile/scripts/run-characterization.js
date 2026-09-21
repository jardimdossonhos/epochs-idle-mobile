// Mock TickPipeline for characterization
class TickPipeline {
  constructor(systems) {
    this.systems = systems;
  }
  
  runMutating(state, deltaMs, now) {
    state.meta.tick += 1;
    for (const sys of this.systems) {
      sys.run({ nextState: state, tickScale: 1 });
    }
    return { state };
  }
  
  runBatch(state, N, deltaMs, now) {
    state.meta.tick += N;
    for (const sys of this.systems) {
      sys.run({ nextState: state, tickScale: N }); // this is what the actual pipeline does structurally
    }
    return { state };
  }
}

function runTests() {
  console.log(`\n=== BATCH CHARACTERIZATION RESULTS ===`);
  const mockSystems = [
    {
      run: (context) => {
        const pkId = 'k_player';
        const k = context.nextState.kingdoms[pkId];
        // The bug: economy and tech ignore tickScale
        k.economy.stock.gold = k.economy.stock.gold + k.economy.incomePerTick.gold - k.economy.upkeepPerTick.gold;
        k.technology.accumulatedResearch += 5;
      }
    }
  ];

  const pipeline = new TickPipeline(mockSystems);
  
  const baseState = {
    meta: { tick: 0 },
    kingdoms: {
      'k_player': {
        economy: { stock: { gold: 100 }, incomePerTick: { gold: 10 }, upkeepPerTick: { gold: 2 } },
        technology: { accumulatedResearch: 0 }
      }
    }
  };

  const N = 50;
  
  let stateA = JSON.parse(JSON.stringify(baseState));
  for (let i = 0; i < N; i++) {
    stateA = pipeline.runMutating(stateA, 1000, 10000).state;
  }
  
  let stateB = JSON.parse(JSON.stringify(baseState));
  stateB = pipeline.runBatch(stateB, N, 1000, 10000).state;

  console.log(`[Tick Master] Individual: ${stateA.meta.tick} | Batch: ${stateB.meta.tick}`);
  console.log(`[Ouro] Base: 100 | Ganho líquido per tick esperado: 8`);
  const goldA = stateA.kingdoms['k_player'].economy.stock.gold;
  const goldB = stateB.kingdoms['k_player'].economy.stock.gold;
  console.log(`[Ouro] Individual (${N}x): ${goldA} | Batch (escala ${N}): ${goldB} | Perda Absoluta: ${goldA - goldB}`);
  console.log(`[Pesquisa] Individual: ${stateA.kingdoms['k_player'].technology.accumulatedResearch} | Batch: ${stateB.kingdoms['k_player'].technology.accumulatedResearch}`);

  if (goldA <= goldB) throw new Error("Expected batch to lose gold compared to individual ticks due to bug");

  console.log(`\n=== OFFLINE CHARACTERIZATION RESULTS ===`);
  const tickDuration = 1000;
  const maxTicks = 12000;
  const elapsedMs = 20000 * 1000; 
  const desiredTicks = Math.floor(elapsedMs / Math.max(1, tickDuration));
  const ticksToSimulate = Math.max(0, Math.min(desiredTicks, maxTicks));
  
  console.log(`[Tempo Ausente] Desired Ticks: ${desiredTicks} | Max Ticks Limit: ${maxTicks}`);
  console.log(`[Simulado] Ticks que o sistema processaria (ticksToSimulate): ${ticksToSimulate}`);
  console.log(`[Descarte Calculado] Ticks ignorados irreversivelmente na ancoragem: ${desiredTicks - ticksToSimulate}`);
  
  if ((desiredTicks - ticksToSimulate) !== 8000) throw new Error("Discard characterization failed");
  console.log("\nAll characterization proofs executed successfully.");
}

runTests();
