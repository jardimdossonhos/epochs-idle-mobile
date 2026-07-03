# BRIEFING — 2026-07-02T16:18:02-03:00

## Mission
Verify the map view modes and Fog of War implementation refinements in the Epochs Idle map overhaul project.

## 🔒 My Identity
- Archetype: reviewer-critic
- Roles: reviewer, critic
- Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_reviewer_m2_3
- Original parent: feb391fe-ca85-4038-b755-dad699645e1e
- Milestone: M2-3
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Network restriction: CODE_ONLY mode (no external HTTP/HTTPS requests)

## Current Parent
- Conversation ID: feb391fe-ca85-4038-b755-dad699645e1e
- Updated: not yet

## Review Scope
- **Files to review**:
  - `mobile/src/ui/components/map/map-helpers.ts`
  - `mobile/src/ui/components/WorldMapSkia.tsx`
  - `tests/map-view-modes-fow.test.ts` (or equivalent test file for Fog of War)
- **Interface contracts**: `PROJECT.md` or `SCOPE.md` if present
- **Review criteria**: correctness, logical completeness, quality, and adversarial robustness of Fog of War and map view helpers.

## Review Checklist
- **Items reviewed**: None
- **Verdict**: pending
- **Unverified claims**: helper correctness, import paths, memoization cache, clamping constraints, test execution status.

## Attack Surface
- **Hypotheses tested**: None
- **Vulnerabilities found**: None
- **Untested angles**: memoization collision/leak, NaN handling boundary cases, color clamping boundaries.

## Key Decisions Made
- Initial setup and briefing initialization.

## Artifact Index
- None
