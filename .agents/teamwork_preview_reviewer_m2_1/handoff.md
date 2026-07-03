# Handoff Report - Map View Modes & Fog of War Review

This report presents a thorough review of the map view modes and Fog of War implementation in Epochs Idle mobile.

## 1. Observation

- **Root TypeScript Check**: Running `npx tsc --noEmit` on the root workspace completed successfully with zero compilation errors.
- **Mobile TypeScript Check**: Running `npx tsc --noEmit` in the `mobile` workspace returned the following errors:
  ```
  src/application/game-session.ts(711,3): error TS2393: Duplicate function implementation.
  src/application/game-session.ts(1567,10): error TS2393: Duplicate function implementation.
  src/application/game-session.ts(1574,32): error TS2339: Property 'directives' does not exist on type 'AdministrationState'.
  src/core/simulation/systems/council-system.ts(351,30): error TS2552: Cannot find name 'getOwnedRegionIds'. Did you mean 'ownedRegionIds'?
  src/ui/components/WorldMapSvg.tsx(124,13): error TS7022: 'regionState' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
  ```
- **Tests Execution**: Running `npm run test` in the root workspace succeeded, passing 58/58 tests:
  ```
  Test Files  25 passed (25)
  Tests  58 passed (58)
  Duration  7.66s
  ```
- **Economy Coloring Logic**: In `mobile/src/ui/components/WorldMapSkia.tsx` (lines 287-295):
  ```typescript
      } else if (viewMode === 'economy') {
        const autonomy = regionState?.autonomy ?? 0;
        const unrest = regionState?.unrest ?? 0;
        const devastation = regionState?.devastation ?? 0;
        const assimilation = regionState?.assimilation ?? 1;

        const productivity = (1 - autonomy) * (1 - unrest) * (1 - devastation) * assimilation;
        // Lerp between Dark Steel-Blue (#2A3E5C) and Gold/Yellow (#E5C05C)
        finalColor = interpolateColor('#2A3E5C', '#E5C05C', productivity);
      }
  ```
- **Color Interpolation**: In `mobile/src/ui/components/WorldMapSkia.tsx` (lines 60-84):
  ```typescript
  export function interpolateColor(color1: string, color2: string, factor: number): string {
    const parseHex = (hex: string) => { ... };
    const c1 = parseHex(color1);
    const c2 = parseHex(color2);

    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));

    const toHex = (val: number) => {
      const hex = val.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  ```
- **Replicated Unit Tests**: Lines 3-82 of `tests/map-view-modes-fow.test.ts` replicate the implementation of `interpolateColor` and `applyFogOfWar` instead of importing them from `WorldMapSkia.tsx`.

---

## 2. Logic Chain

1. **Incorrect Economy Shading**: The default values fallback (`autonomy = 0`, `unrest = 0`, `devastation = 0`, `assimilation = 1`) evaluates to `productivity = 1.0` if `regionState` is missing/undefined. This means that unclaimed or unsimulated regions will be rendered in maximum productivity (gold), which is incorrect.
2. **Crash Risk on NaN/Overflow**: The lack of clamping in `interpolateColor` means if a region's data returns `NaN`, the resulting string will be `"#NaNNaNNaN"`, which crashes Skia canvas drawing. Factors outside `[0,1]` also generate invalid hex colors.
3. **Disconnected Test Coverage**: Replicating helpers in `tests/map-view-modes-fow.test.ts` means tests pass even if the production helpers in `WorldMapSkia.tsx` are broken or updated incorrectly, causing a gap in coverage.
4. **Typescript Compilation Error**: The 5 compiler errors in the `mobile` workspace block building the mobile app.

---

## 3. Caveats

- **Visual Checking**: Direct visual rendering validation was not done in the absence of a device/emulator.
- **Root vs Mobile Typescript**: Typescript typechecking is clean in the root project, meaning all issues are concentrated inside `mobile/`.

---

## 4. Conclusion

The map overhauled features are performant and test-covered, but the PR requires changes due to correctness (economy view mode displaying unsimulated regions as 100% productive), robustness (potential `NaN` color crashes), test isolation issues, and active compilation errors in the mobile workspace.

---

## 5. Verification Method

- Run `npm run test` in the root workspace to confirm that the existing test suite continues to pass.
- Run `npx tsc --noEmit` in `mobile/` to verify that all compilation issues are resolved.
- Inject a mock state containing `NaN` for unrest and verify that the app does not crash or generate `"#NaNNaNNaN"`.
