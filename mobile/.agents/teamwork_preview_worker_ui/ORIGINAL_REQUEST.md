## 2026-07-06T18:29:39Z
Implement Milestone 4: R2: UI Controls.
Modify MenuScreen.tsx to implement the visual automation controls.

Instructions:
1. In c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\ui\screens\MenuScreen.tsx:
   - Import `AutomationLevel` from `../../core/models/enums`.
   - Destructure `playerKingdomId` from `useGameState()`.
   - Calculate active statuses for Economy, Religion, Defense, and Master automation.
   - Implement handlers: `toggleEconomy`, `toggleDefense`, `toggleReligion`, `toggleMaster`.
   - Under the Speed Control section (Velocidade do Tempo), add a new section named "Modo Idle (Automação)" containing the toggles for:
     - Mestre (using toggleGlobalAutomation)
     - Automatizar Economia (using setEconomyAutomation)
     - Automatizar Defesa Militar (using setDefenseAutomation)
     - Automatizar Religião (using updateAutomationDirective for 'religious_mission')
   - Add styles for `automationBox`, `autoRow`, `autoLabel`, `autoDesc`, `autoBtn`, `autoBtnActive`, `autoBtnManual`, and `autoBtnText` in the StyleSheet, matching the project style conventions.
2. Validate the layout compiles and boots successfully:
   - `npx tsc --noEmit`
   - `npx tsx test-boot.ts`
3. Run vitest unit tests in root directory to ensure they all still pass:
   - `npm run test`

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_ui\handoff.md.
