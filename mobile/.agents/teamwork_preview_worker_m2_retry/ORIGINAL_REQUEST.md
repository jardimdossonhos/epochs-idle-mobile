## 2026-07-10T10:46:58Z
You are teamwork_preview_worker_m2_retry.
Your working directory is: c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_worker_m2_retry/
Your parent conversation ID is: 2c32fe3f-0327-496e-b1f9-65c93610ccdc.

Your task is to implement the following Sprint 3 requirements:
- R1: Respeito à Seleção de Território (Universal) - make sure player starts in selected region for Google/Guest/Mock login.
- R3: Correção de Visibilidade do Autosave - ensure autosave slot is visible and loadable in load game menu.
- R4: Revisão Visual e Lógica do Play/Pause - ensure play/pause toggle is instant and responsive.
- R7: Visibilidade Plena no Modo Desenvolvedor (Fog of War) - toggling Fog of War off in DevMode shows all IA boundaries on the map.

Additionally, resolve the following 3 TypeScript errors during compilation:
1. `src/core/simulation/systems/character-system.ts`: add missing Character properties (`level`, `experience`, `unspentTalentPoints`) to character templates/mocks.
2. `src/infrastructure/persistence/save-schema.ts`: add missing Character properties (`level`, `experience`, `unspentTalentPoints`) to character templates/mocks.
3. `src/ui/components/WorldMapSkia.tsx`: add a type annotation like `neighborId: string` to parameter `neighborId` at line ~280.

Please read the handoff report from explorer_m1_1 here: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_1/handoff.md` and `analysis.md` in that folder for files and proposed logic changes.

MANDATORY INTEGRITY WARNING:
"DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."

Requirements for completion:
1. Apply the code modifications carefully.
2. Run TypeScript check via `npx tsc --noEmit` and run tests (e.g. `npx tsx test-boot.ts`) to ensure nothing is broken.
3. Write your implementation report `changes.md` and your final `handoff.md` in your working directory.
