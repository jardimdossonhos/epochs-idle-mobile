# Adversarial Challenge Report — Map Helpers Performance Stress Test (Challenger M2-1)

**Overall risk assessment**: MEDIUM

## Challenge Summary

This report stress-tests the Map helpers (`applyFogOfWar`, `interpolateColor`, and `calculateVisibility`) under simulated workloads and scale. We evaluated execution time, cache hit rate, memory growth, and boundary inputs.

All tests passed successfully under Vitest in the local execution environment.

---

## Stress Test Results

The benchmark test suite was run under Vitest (Node.js environment). Below are the empirical measurements for a workload of 10,000 iterations:

| Metric / Scenario | Workload Size | Execution Time (ms) | Cache Hit Rate | Frame Budget Met (< 1.0 ms) |
|---|---|---|---|---|
| **applyFogOfWar (Uncached / Cold)** | 10,000 unique colors | **9.1412 ms** | 0% | No |
| **applyFogOfWar (Cached / Warm)** | 10,000 repetitive colors | **0.5629 ms** | 100% | **YES** (0.56 ms) |
| **applyFogOfWar (Pure Calculation)** | 10,000 unique colors (no cache) | **4.4686 ms** | N/A | No |
| **interpolateColor** | 10,000 color interpolations | **4.4589 ms** | N/A | N/A |
| **calculateVisibility (Small Map)** | 1,000 regions | **0.7569 ms** | N/A | **YES** (< 16.6 ms) |
| **calculateVisibility (Large Map)** | 5,000 regions | **1.6882 ms** | N/A | **YES** (< 16.6 ms) |

- **Cache Speedup Factor**: **16.24x** compared to uncached execution.
- **Unbounded Cache Growth Stress**: **100,000 unique entries** injected in **63.90 ms** without execution crash.

---

## Challenges

### [Medium] Challenge 1: Unbounded Cache Memory Growth in `applyFogOfWar`

- **Assumption challenged**: The set of color values passed to `applyFogOfWar` is small and static (e.g., static faction/kingdom colors).
- **Attack scenario**: Animated UI transitions, flashing region highlights, or continuous day/night cycle shading where colors are dynamically interpolated on every frame, generating thousands of unique hex colors over long play sessions.
- **Blast radius**: The `fogOfWarCache` Map has no size limit or eviction strategy (LRU/TTL). Storing thousands of generated colors will slowly leak memory in V8. Under extreme workloads (e.g. 100,000 unique colors), the cache grows indefinitely, causing memory pressure.
- **Mitigation**: Introduce a capped cache mechanism (e.g. a simple FIFO/LRU eviction or limiting the cache size to 1,000 entries) or use a `WeakMap`/`TTL` cache.

### [Low] Challenge 2: Performance Overhead of `interpolateColor` on Large Batches

- **Assumption challenged**: `interpolateColor` is highly performant and can be executed arbitrarily.
- **Attack scenario**: Processing color blending for a large map with 10,000+ regions dynamically on every frame.
- **Blast radius**: In our stress-test, 10,000 calls to `interpolateColor` took ~4.46 ms, which consumes nearly 27% of the standard 60 FPS frame budget (16.6 ms). If executed per frame during rendering, it will cause frame drops.
- **Mitigation**: Avoid calling `interpolateColor` on every frame for all regions. Cache the results of common interpolation parameters or perform color blending in shaders / PIXI.js logic rather than in pure JS.

### [Low] Challenge 3: Silent Failure on Malformed Input in `interpolateColor`

- **Assumption challenged**: Only valid CSS hex color strings are passed to map helpers.
- **Attack scenario**: Passing invalid string identifiers like `"invalid"` or names of colors (e.g. `"red"`).
- **Blast radius**: The `parseHex` function internally does `parseInt(clean, 16)`. For `"invalid"`, this evaluates to `NaN`. The function converts `NaN` to `0` using bitwise shift `>>`. As a result, it returns `#808080` (grey) at `factor = 0.5` without warning or throwing an error, masking upstream data bugs.
- **Mitigation**: Validate color input formats with a simple regex or throw/log warning on parse failure.

### [Medium] Challenge 4: Scale Bottleneck in `calculateVisibility`

- **Assumption challenged**: `calculateVisibility` is lightweight enough to run continuously.
- **Attack scenario**: Large-scale world maps (e.g. 5,000 regions) recalculating visibility on every game tick.
- **Blast radius**: 5,000 regions required ~1.69 ms to evaluate. While under the single frame budget of 16.6 ms, it constitutes ~10% of the total CPU time. If run continuously alongside simulation tick pipelines, it will degrade performance.
- **Mitigation**: Recalculate visibility reactively (only when a player/ally gains/loses a region or diplomatic status changes) and cache the resulting set.

---

## Unchallenged Areas

- **MapPathConverter** — Not challenged as it is out of scope for the Fog of War/color performance stress test.
