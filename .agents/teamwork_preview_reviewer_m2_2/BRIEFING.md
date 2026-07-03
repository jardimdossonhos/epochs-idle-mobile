# BRIEFING — 2026-07-02T16:06:58-03:00

## Mission
Review the map view modes and Fog of War implementation by Worker M2-1, verifying UI rendering, Set-based visibility logic, HSL conversion math/performance, and test coverage.

## 🔒 My Identity
- Archetype: Reviewer & Adversarial Critic
- Roles: reviewer, critic
- Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_reviewer_m2_2
- Original parent: feb391fe-ca85-4038-b755-dad699645e1e
- Milestone: M2 - Map Overhaul
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Follow system prompt protection rules
- Follow file workspace convention: write only to own folder, read any folder

## Current Parent
- Conversation ID: feb391fe-ca85-4038-b755-dad699645e1e
- Updated: not yet

## Review Scope
- **Files to review**: `MapScreen.tsx`, Fog of War calculations, HSL conversions, and test suite.
- **Interface contracts**: Correctness, performance, visual overlap, test coverage.
- **Review criteria**: Check rendering of FABs, correctness and efficiency of Set-based O(N) visibility logic, HSL math correctness, CPU performance bottlenecks, test completeness.

## Key Decisions Made
- Identified layout overlap bug: FABs overlap with RegionDetailPanel on the right side. Recommended hiding FABs when a region is selected.
- Identified FOW correctness issue: applyFogOfWar uses absolute Saturation/Lightness constants, causing dark/gray colors to be brightened/saturated instead of darkened/desaturated. Recommended relative scaling.
- Identified CPU performance bottleneck: applyFogOfWar runs on every tick for thousands of hexes. Recommended Map cache or GPU ColorMatrix shader.
- Identified test integrity violation: test suite replicates production code to bypass React Native/Skia imports, creating a facade test. Recommended extracting pure math helpers to a dedicated utility file.

## Artifact Index
- `review_m2_2.md` — Quality and Adversarial Review Report
- `handoff.md` — Handoff report following the 5-component protocol

## Review Checklist
- **Items reviewed**: MapScreen.tsx UI layout, WorldMapSkia.tsx visibility & HSL logic, tests/map-view-modes-fow.test.ts, test execution
- **Verdict**: REQUEST_CHANGES
- **Unverified claims**: Production code HSL correctness (it's verified broken), CPU bottleneck (theoretical/logical profiling, confirmed JS thread risk)

## Attack Surface
- **Hypotheses tested**: 
  - Overlap between FABs and RegionDetailPanel: Checked layout math, confirmed overlap on standard screen sizes.
  - HSL math correctness: Calculated hand-traced conversion for dark colors, proved that absolute target constants cause color brightening instead of darkening.
  - Test suite imports: Inspected test file, verified that production code is not imported, creating a facade.
- **Vulnerabilities found**:
  - Absolute HSL value forcing (breaks FOW color aesthetics).
  - High CPU usage in loop (perf bottleneck).
  - Facade unit tests (no real codebase verification).
  - Visual layout overlap.
- **Untested angles**:
  - Real devices FPS profiling (restricted environment).

