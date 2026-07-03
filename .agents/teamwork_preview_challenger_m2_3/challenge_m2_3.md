# Challenge Report M2-3 — Performance Benchmarks and Stress Tests on the New Cache Limit

## Challenge Summary

**Overall risk assessment**: LOW

The new cache size limit implementation in `fogOfWarCache` prevents unbounded memory growth by capping the cache to 1000 entries. Stress testing shows that it successfully runs under heavy load (100,000 unique color generations) without crashes or memory leaks, keeping heap usage of the cache structure itself constant. Under typical gameplay where the map uses a limited set of colors, cache hits provide a speedup factor of **~7.4x** compared to cache misses, easily meeting the frame budgets for both 60 FPS and 120 FPS.

---

## Challenges

### [Low] Challenge 1: Cache Thrashing under High Color Cardinality

- **Assumption challenged**: The assumption that the total number of unique colors processed by `applyFogOfWar` will always remain well below 1000.
- **Attack scenario**: If a mod or future feature introduces high-gradient terrain colors or a dynamic day/night cycle that interpolates map colors to thousands of distinct values, the cache size will frequently hit 1000. Because the eviction strategy is a simple "clear-all-on-full" (`fogOfWarCache.clear()`), hitting the 1000 limit triggers a complete cache flush. This causes the cache hit rate to drop to nearly 0%, inducing cache thrashing where the overhead of cache writes/clears is added to the full calculation cost.
- **Blast radius**: Increased CPU usage during map rendering, leading to potential frame rate drops and stuttering when panning/zooming.
- **Mitigation**: If the game requirements change to support thousands of distinct map colors, replace the "clear-all-on-full" strategy with a lightweight LRU or FIFO eviction strategy, or increase the limit (e.g., to 5000), which still represents negligible memory footprint.

### [Low] Challenge 2: Memory Footprint under Large Input Arrays

- **Assumption challenged**: Memory allocation is solely determined by cache size.
- **Attack scenario**: While the cache itself is bounded, constructing large arrays of input strings (e.g., passing thousands of colors in a single render call) can cause temporary heap spikes.
- **Blast radius**: Temporary heap memory delta of ~8.8 MB observed when generating 100,000 unique color strings. This is garbage collected and does not cause OOM on modern platforms, but shows that input generation size should be managed.
- **Mitigation**: Clean up/dispose of temporary arrays after rendering, or reuse array pools where possible.

---

## Stress Test Results

Stress tests were executed via `vitest` in the Node.js/V8 environment.

### 1. Cache Capping & Memory Stress Test
- **Scenario**: Generate and process 100,000 unique colors sequentially.
- **Expected Behavior**: Cache size never exceeds 1000 entries; no memory leaks or crashes occur.
- **Actual Behavior**: 
  - **Status**: PASS
  - **Injected unique entries**: 100,000
  - **Total execution time**: 29.23 ms (for 100,000 calls)
  - **Max cache size observed**: 1000 (verified by periodic assertion `currentSize <= 1000`)
  - **Final cache size**: 50 (exactly matching mathematical expectation of 100,000 % 1000 = 50, after starting with 50 pre-warmed entries)
  - **Heap memory before**: 16.20 MB
  - **Heap memory after**: 24.39 MB (delta 8.19 MB, representing the 100,000 unique input strings generated for testing; the cache itself remained bounded)
  - **Crashes/OOM**: None.

### 2. Cache Hit Performance & Speedup Benchmarks
- **Scenario**: Execute 10,000 calls to `applyFogOfWar` with 100% cache misses vs 100% cache hits.
- **Expected Behavior**: Significant speedup when cached; execution time fits in frame budgets.
- **Actual Behavior**:
  - **Status**: PASS
  - **Uncached (0% Cache Hit Rate)**: 3.88 ms (for 10,000 iterations)
  - **Cached (100% Cache Hit Rate)**: 0.52 ms (for 10,000 iterations)
  - **Pure Calculations (No Cache Wrapper)**: 2.75 ms
  - **Cache Speedup factor**: **7.44x** (Cached vs Uncached)

### 3. Frame Budget Verification
For a map containing 10,000 hexes:
- **60 FPS Frame Budget**: 16.67 ms
- **120 FPS Frame Budget**: 8.33 ms
- **Cached execution (10,000 hexes)**: **0.52 ms**
  - Consumes **3.1%** of 60 FPS budget.
  - Consumes **6.2%** of 120 FPS budget.
- **Uncached execution (10,000 hexes)**: **3.88 ms**
  - Consumes **23.3%** of 60 FPS budget.
  - Consumes **46.6%** of 120 FPS budget.

In typical gameplay where map colors are static or change slowly, the cache hit rate is close to 100%, ensuring that rendering easily runs well within both 60 FPS and 120 FPS frame budgets.

---

## Unchallenged Areas

- **GPU Memory Overheads** — The benchmark focuses on V8/CPU execution of color calculations and cache operations. It does not measure GPU upload times or WebGL texture cache performance, which depend on the underlying rendering engine (MapLibre/PixiJS) and target hardware.
