## 2026-07-06T18:22:54Z
Implement Milestone 3: R2: Engine & Session.
Modify automation-system.ts and game-session.ts to implement automated religion missionary campaigns and add the necessary session setters for the automation toggles.

Instructions:
1. In c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\core\simulation\systems\automation-system.ts:
   - Add `getKingdomCapitalIndex` function.
   - At the end of the main loop inside `createAutomationSystem`, check if `directives.religious_mission` is active. If so, automatically find border targets, check cost (Gold 18, Faith 26, Legitimacy 2), check cooldown, and execute the missionary campaign (deduct costs from state.ecs and kingdom stock, check chance, roll math.random, update externalInfluenceIn or deduct stability, and push a 'religion.mission_started' event if successful).
2. In c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\application\game-session.ts:
   - Add `setEconomyAutomation(level: AutomationLevel): void` method which sets player `economy` and `construction` automation.
   - Add `setDefenseAutomation(level: AutomationLevel): void` method which sets player `defense` and `expansion` automation.
   - Modify `toggleGlobalAutomation` to set `player.administration.directives.religious_mission` to `true` (when active is true) or `false` (when active is false).
3. Validate by running the typescript check and boot tests:
   - `npx tsc --noEmit`
   - `npx tsx test-boot.ts`
4. Also run Vitest unit tests in the root project directory `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle` to ensure no regression in core systems:
   - `npm run test` (to make sure vitest passes all tests)

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_engine\handoff.md.
