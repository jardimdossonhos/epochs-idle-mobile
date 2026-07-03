## 2026-07-03T10:52:31Z
You are Worker M2-3 for the Epochs Idle map overhaul project.
Your working directory is `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_3`.
Please address the issues raised by the reviewers (M2-5 and M2-6):
1. **Unbounded Cache Growth**: Update `applyFogOfWar` in `mobile/src/ui/components/map/map-helpers.ts` to prevent unbounded cache growth in `fogOfWarCache`. If `fogOfWarCache.size >= 1000`, clear it before setting the new entry.
2. **Naive/Broken Test Assertions**: In `tests/map-helpers-boundary.test.ts` (around lines 105-108), the component-wise assertion expects output RGB components to be less than or equal to input RGB components. Change this to compare output components to `Math.max(inputRgb.r, inputRgb.g, inputRgb.b)` instead, so that desaturated secondary/minor components of highly saturated primary colors can increase without failing the check.
3. **Verify compilation**: Run `npx tsc --noEmit` inside the `mobile` folder to ensure clean TypeScript compilation.
4. **Verify tests**: Run `npx vitest run` in the project root to ensure all tests (including stress and boundary tests) pass cleanly.
5. **Document findings**: Write your handoff report to `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_3\handoff.md`.

MANDATORY INTEGRITY WARNING — DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Communicate back once completed.
