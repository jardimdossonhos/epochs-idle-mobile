# BRIEFING — 2026-07-03T11:00:00Z

## Mission
Review the Map View Modes (R1) and Fog of War (R2) implementation, focusing on color transformations, cache growth/leaks, visibility rules, and running TypeScript/Vitest checks.

## 🔒 My Identity
- Archetype: reviewer_critic
- Roles: reviewer, critic
- Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_reviewer_m2_6
- Original parent: 47a411f4-4eb7-45ad-b953-934df089da67
- Milestone: Milestone 2 Review
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code.
- Focus on R1 (Map View Modes) and R2 (Fog of War).
- Specific checks on: relative HSL desaturation/darkening, `fogOfWarCache` memory/performance, visibility correctness, TSC/Vitest checks.

## Current Parent
- Conversation ID: 47a411f4-4eb7-45ad-b953-934df089da67
- Updated: 2026-07-03T11:00:00Z

## Review Scope
- **Files to review**:
  - `mobile/src/ui/components/map/map-helpers.ts`
  - `mobile/src/ui/components/WorldMapSkia.tsx`
  - `tests/map-helpers-boundary.test.ts`
  - `tests/map-helpers-stress.test.ts`
  - `tests/map-view-modes-fow.test.ts`
- **Interface contracts**: `mobile/src/ui/components/map/map-helpers.ts`
- **Review criteria**: correctness, logical completeness, caching safety, and test compliance.

## Key Decisions Made
- Confirmed that the HSL conversion is mathematically sound but mathematically incompatible with the boundary test assertions (which assume component-wise non-increase during desaturation).
- Confirmed that `fogOfWarCache` has no eviction policy and will leak memory under dynamic color inputs like manpower ratios.
- Confirmed that adjacency and visibility calculations are correct.
- Verdict is set to `REQUEST_CHANGES` due to 6 failing tests and cache safety issues.

## Review Checklist
- **Items reviewed**:
  - `applyFogOfWar` relative HSL algorithm
  - `fogOfWarCache` memory usage and dynamic inputs
  - `calculateVisibility` adjacency rules
  - TypeScript compiler (`npx tsc --noEmit`) and Vitest test suite runs
- **Verdict**: REQUEST_CHANGES
- **Unverified claims**: None

## Attack Surface
- **Hypotheses tested**:
  - Unbounded cache growth under dynamic input: confirmed. Since manpower ratio is float-based and changes tick-by-tick, `fogOfWarCache` accumulates entries continuously.
  - Saturated color desaturation: confirmed that minor RGB components must increase, violating the test assertions.
- **Vulnerabilities found**:
  - Memory leak / memory exhaustion via unbounded `Map` cache growth.
- **Untested angles**: None.

## Artifact Index
- c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_reviewer_m2_6\handoff.md — Final review report
