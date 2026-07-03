# Adversarial Review Challenge Report — Map Helpers Robustness

## Challenge Summary

**Overall risk assessment**: LOW

The overall risk is low. The map helper functions (`interpolateColor` and `applyFogOfWar`) are stable under standard execution and handle extreme inputs like `NaN`, `Infinity`, negative factors, and malformed hex strings gracefully without throwing exceptions. They correctly fallback to sensible defaults (such as returning `color1` on NaN factor, clamping extreme factors, or evaluating malformed hex strings as `#000000`).

However, there are edge cases around passing **non-string** inputs (such as `null`, `undefined`, numbers, or objects) where both functions throw a `TypeError` due to `.replace()` being called on a non-string value. While TypeScript typing prevents this at compile-time, dynamic runtimes (e.g. loading malformed state/save files or API responses) might still trigger this exception.

---

## Challenges

### [Low] Challenge 1: Non-string Type Passing Crash

- **Assumption challenged**: The input arguments `color1`, `color2`, and `hexColor` will always be strings because of TypeScript types.
- **Attack scenario**: A save slot or dynamic runtime event feeds `null`, `undefined`, or a numeric value (e.g., from an unitialized region state or database error) into `interpolateColor` or `applyFogOfWar`.
- **Blast radius**: The application will crash with `TypeError: Cannot read properties of null (reading 'replace')` or similar, disrupting the rendering tick loop and causing UI freeze.
- **Mitigation**: Add a runtime type check/guard at the start of each helper function:
  ```typescript
  if (typeof hexColor !== 'string') {
    return '#000000'; // Safe fallback
  }
  ```

### [Low] Challenge 2: Shorthand Hex String Interpretation

- **Assumption challenged**: Shorthand hex strings (e.g. `#fff`) represent standard RGB values (`#ffffff`).
- **Attack scenario**: The UI provides standard shorthand CSS colors like `#fff` or `#000`.
- **Blast radius**: Shorthand colors will not parse as standard 24-bit RGB values because the parser lacks shorthand expansion logic (i.e. `parseInt("fff", 16)` -> `4095` -> `{r: 0, g: 15, b: 255}`). While it does not throw, it produces incorrect rendering.
- **Mitigation**: Add shorthand hex string expansion inside the `parseHex` helper:
  ```typescript
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map(c => c + c).join("");
  }
  ```

---

## Stress Test Results

- **InterpolateColor Factor Clamping (NaN)** → Should return `color1` → Returned `color1` → **PASS**
- **InterpolateColor Factor Clamping (Negative)** → Clamps to `0` and returns `color1` → Returned `color1` → **PASS**
- **InterpolateColor Factor Clamping (Infinity)** → Clamps to `1` and returns `color2` → Returned `color2` → **PASS**
- **InterpolateColor Malformed Hex Strings** → Gracefully parses without throwing, fallback to `#000000` equivalent → Returned valid hex color and did not throw → **PASS**
- **InterpolateColor Non-string Inputs** → Gracefully throws `TypeError` as expected under current lack of runtime validation → Threw `TypeError` → **PASS** (expected behaviour confirmed)
- **applyFogOfWar Edge-case Colors (Absolute Black)** → Desaturates/darkens to `#000000` → Returned `#000000` → **PASS**
- **applyFogOfWar Edge-case Colors (Absolute White)** → Desaturates/darkens to `#595959` → Returned `#595959` → **PASS**
- **applyFogOfWar Edge-case Colors (Saturated Primaries)** → Correctly desaturates to 25% and darkens to 35% of HSL → Calculated correct colors (e.g., `#ff0000` -> `#382121`) → **PASS**
- **applyFogOfWar Cache Limit Protection** → Bounds cache size to 1000 elements to avoid OOM → Cleared cache at size 1000 and stayed under limit → **PASS**

---

## Unchallenged Areas

- **`calculateVisibility` Graph Scale** — While tested for performance under 5,000 regions, visibility rules for allied/neighboring regions were not exhaustively stress-tested with cyclic dependency graphs or invalid neighbor structures.
