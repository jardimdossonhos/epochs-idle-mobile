# Handoff Report - Worker M2-3

## 1. Observation

### Unbounded Cache Growth in `applyFogOfWar`
In `mobile/src/ui/components/map/map-helpers.ts` (lines 3 and 101-104), the `fogOfWarCache` was defined as a module-level `Map` and entries were set without any bounds checks or eviction strategies:
```typescript
3: const fogOfWarCache = new Map<string, string>();
...
101:   const result = `#${toHex(finalR)}${toHex(finalG)}${toHex(finalB)}`;
102:   fogOfWarCache.set(hexColor, result);
103:   return result;
```

### Naive/Broken Test Assertions
When running `npx vitest run`, 6 test failures were observed in `tests/map-helpers-boundary.test.ts` (lines 105-108):
```
 FAIL  tests/map-helpers-boundary.test.ts > Map Helpers Boundary Conditions > applyFogOfWar > correctly processes highly saturated red (#ff0000)
AssertionError: expected 33 to be less than or equal to 0
 ❯ tests/map-helpers-boundary.test.ts:107:29
    105|         // 2. Ensure output is never brighter than input (component-wi…
    106|         expect(outputRgb.r).toBeLessThanOrEqual(inputRgb.r);
    107|         expect(outputRgb.g).toBeLessThanOrEqual(inputRgb.g);
       |                             ^
    108|         expect(outputRgb.b).toBeLessThanOrEqual(inputRgb.b);
```
The test failed because highly saturated colors like `#ff0000` (pure red, where green and blue components are 0) desaturate when fog of war is applied. This causes the minor components (green and blue) to increase above their initial value of 0, violating the component-wise constraint `outputRgb.g <= inputRgb.g`.

---

## 2. Logic Chain

1. **Unbounded Cache Growth Mitigation**:
   - *Observation*: `fogOfWarCache` grows indefinitely without limit.
   - *Reasoning*: A size limit of `1000` was specified by reviewers. Checking `fogOfWarCache.size >= 1000` before writing new entries, and calling `fogOfWarCache.clear()` if met, prevents unbounded memory accumulation while preserving cache hits for small-to-moderate map operations.
   - *Action*: Implemented the limit check in `applyFogOfWar` and exported `getFogOfWarCacheSize` to allow test verification.

2. **Correcting Naive Assertions**:
   - *Observation*: Minor components of highly saturated input colors increase (e.g. `0` -> `33`) to represent desaturation.
   - *Reasoning*: The requirement is to ensure the output color is never brighter than the input color. Comparing output components against `Math.max(inputRgb.r, inputRgb.g, inputRgb.b)` ensures no output component exceeds the maximum intensity of any input component, which correctly allows secondary/minor components of highly saturated primary colors to increase for desaturation without failing the brightness check.
   - *Action*: Updated the assertions to compare against `maxInput` component, and added a specific cache size limit test.

---

## 3. Caveats
- **Eviction Strategy**: The cache is cleared completely (`.clear()`) rather than utilizing a least-recently-used (LRU) policy. While complete clearing is simple, minimal, and fully compliant with the prompt's request ("If `fogOfWarCache.size >= 1000`, clear it before setting the new entry"), it may cause a brief performance penalty when the limit is hit. Under standard map rendering scenarios, the active colors are small enough that this has no noticeable impact.

---

## 4. Conclusion
The unbounded cache growth has been mitigated by clearing the cache if the size reaches or exceeds 1000 entries. The naive test assertions in `tests/map-helpers-boundary.test.ts` have been replaced with checks comparing the output components against the maximum of the input RGB components. All tests now pass, and both the `mobile` codebase and the test project compile cleanly.

---

## 5. Verification Method

To verify these changes independently:

### Verification Commands
1. **Run TypeScript compiler check**:
   ```bash
   cd mobile
   npx tsc --noEmit
   ```
   *Expected outcome*: Exits cleanly with no errors.

2. **Run test suite**:
   ```bash
   npx vitest run
   ```
   *Expected outcome*: All 81 tests pass successfully (including `tests/map-helpers-boundary.test.ts` and `tests/map-helpers-stress.test.ts`).

### Files to Inspect
- `mobile/src/ui/components/map/map-helpers.ts`: Confirm the cache check and `getFogOfWarCacheSize` helper are present.
- `tests/map-helpers-boundary.test.ts`: Inspect the modified assertions (lines 105-110) and the new `"limits the cache size to 1000 to prevent unbounded growth"` test case.
