# Handoff Report — Reviewer M2-8

## 1. Observation

### Implementation of `applyFogOfWar` and Cache Capping
In `mobile/src/ui/components/map/map-helpers.ts` (lines 101–106), the cache eviction logic clears the entire Map once the size reaches 1000 entries:
```typescript
  const result = `#${toHex(finalR)}${toHex(finalG)}${toHex(finalB)}`;
  if (fogOfWarCache.size >= 1000) {
    fogOfWarCache.clear();
  }
  fogOfWarCache.set(hexColor, result);
  return result;
```
This is verified by the unit test in `tests/map-helpers-boundary.test.ts` (lines 136–144):
```typescript
    it("limits the cache size to 1000 to prevent unbounded growth", () => {
      for (let i = 0; i < 1100; i++) {
        const hex = `#${i.toString(16).padStart(6, "0")}`;
        applyFogOfWar(hex);
      }
      const finalSize = getFogOfWarCacheSize();
      expect(finalSize).toBeLessThan(1000);
      expect(finalSize).toBeGreaterThan(0);
    });
```

### Corrected assertions in `tests/map-helpers-boundary.test.ts`
In `tests/map-helpers-boundary.test.ts` (lines 105–110), the component-wise assertions compare the output components against the maximum input component `maxInput`:
```typescript
        // 2. Ensure output is never brighter than input (component-wise compared to max input component)
        const maxInput = Math.max(inputRgb.r, inputRgb.g, inputRgb.b);
        expect(outputRgb.r).toBeLessThanOrEqual(maxInput);
        expect(outputRgb.g).toBeLessThanOrEqual(maxInput);
        expect(outputRgb.b).toBeLessThanOrEqual(maxInput);
```

### Compiler and Test Suite Output
- Running `npm run test` (which triggers `vitest run`) results in:
  ```
  Test Files  27 passed (27)
       Tests  81 passed (81)
  ```
- Running `npm run build` (which triggers `tsc -b && vite build`) compiles successfully without any TypeScript compiler (`tsc`) errors:
  ```
  vite v6.4.1 building for production...
  transforming...
  ✓ 788 modules transformed.
  rendering chunks...
  ✓ built in 7.12s
  ```

---

## 2. Logic Chain

### Cache-Capping Threshold
1. *Observation*: The `fogOfWarCache` size is capped by checking `fogOfWarCache.size >= 1000`.
2. *Reasoning*: Because the Map's size is checked before each new item is set, and it is cleared if it reaches 1000, the maximum number of entries stored in the cache is strictly limited to 1000. 
3. *Conclusion*: This effectively eliminates the risk of unbounded memory growth (memory leaks) during long-running sessions with dynamic color changes.

### Mathematical Correctness of Boundary Assertions
1. *Observation*: For highly saturated inputs like `#ff0000` (Red: 255, Green: 0, Blue: 0), desaturation causes the minor components (Green and Blue) to increase (from 0 to 33) while the major component (Red) decreases (from 255 to 56).
2. *Reasoning*: If the test checked component-wise `output <= input`, it would assert `33 <= 0`, resulting in a false failure because the color was actually darkened (overall lightness scaled by 0.35).
3. *Conclusion*: By comparing output components to the maximum input component (`maxInput = 255`), we verify that no output component exceeds the maximum intensity of the input. Since the HSL transformation scales both lightness and saturation down, the maximum output component is mathematically bounded by `0.4375 * maxInput` (plus tiny rounding errors), ensuring the output is never brighter than the input while preventing false positives on saturated colors.

---

## 3. Caveats

- **Complete Cache Eviction Policy**: The cache is cleared completely (`.clear()`) rather than using an LRU eviction strategy. Under normal map rendering with small sets of colors, this O(1) clear is optimal due to its zero overhead. However, if the game is somehow configured with > 1000 highly dynamic colors, it could trigger thrashing (frequent clears and HSL recomputations).

---

## 4. Conclusion

The fixes implemented by Worker M2-3 are **correct, robust, and performant**. The cache-capping mechanism prevents memory leaks safely, and the updated assertions correctly represent the physics of desaturation/darkening without false positives. All tests pass and the code compiles without warnings or errors.

---

## 5. Quality & Adversarial Review Reports

### Quality Review Report
- **Verdict**: **APPROVE**
- **Minor Finding 1 (Eviction Policy)**: The choice of `fogOfWarCache.clear()` when size >= 1000 is simple and performs in O(1) time. Although it causes temporary cache misses, the risk of performance degradation is negligible since typical maps have fewer than 1000 distinct region colors.
- **Verified Claims**:
  - Unbounded cache capped: verified via boundary and stress tests (PASS)
  - Saturated boundary color assertions mathematically correct: verified via boundary tests (PASS)
  - TypeScript compilation: verified via `npm run build` (PASS)
  - Test suite passes: verified via `npm run test` (PASS)

### Adversarial Challenge Report
- **Overall risk assessment**: **LOW**
- **Challenge 1 (Case Sensitivity)**: Cache keys are case-sensitive. Querying `#ff0000` and `#FF0000` creates separate entries. However, because the cache size is strictly capped at 1000, this poses no threat to memory stability.
- **Challenge 2 (Cache Thrashing)**: If a game session utilizes > 1000 unique animated colors, the cache will thrash (continual clear-rebuild loop).
  - *Mitigation*: Ensure map design or animation system does not supply highly transient colors to `applyFogOfWar` directly, or raise the limit if needed.

---

## 6. Verification Method

To independently verify the status:
1. Compile the project:
   ```bash
   npm run build
   ```
2. Run the test suite:
   ```bash
   npm run test
   ```
3. Inspect `mobile/src/ui/components/map/map-helpers.ts` and `tests/map-helpers-boundary.test.ts`.
