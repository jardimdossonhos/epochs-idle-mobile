## 2026-07-03T19:26:17Z
You are the teamwork_preview_worker. Your working directory is c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_sprint\.
Your task is to implement the requirements R3, R4, R5, and R6 for the Epochs Idle game.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Here is the exact implementation spec:

1. R3: HUD Clock Month Skips
   - In `mobile/src/ui/components/TopHUD.tsx`, replace raw rendering of `gameState.meta.tick` with a visual tick interpolator.
   - Use local state `visualTick` and a React hook to animate/sequentially increment `visualTick` by 1 towards the target `gameState.meta.tick` using a fast timeout (e.g., 30-50ms) to ensure the month counter ticks smoothly (e.g., Month 1, 2, 3, 4...) when speed is high (e.g. >1x).
   - If the difference between `visualTick` and the target is very large (e.g., >12 ticks, which happens when loading a game or resuming from a long offline progress catch-up), snap `visualTick` directly to target to avoid lag.

2. R4: Autosave slot auto-1 Empty in Load Game Modal
   - In `mobile/src/application/game-session.ts`, expose a public method `triggerAutosave(): Promise<void>` (or similar) that forces an instant commit of the autosave snapshot to the slot `auto-1` using the `saveRepository`.
   - In `mobile/src/ui/GameProvider.tsx`, in the `AppState` listener for backgrounding: change the un-awaited sync call to an awaited `await session.triggerAutosave()` or similar async call, ensuring it resolves before suspension.
   - In `mobile/src/ui/components/LoadGameModal.tsx`, ensure it lists all known slots (at least `auto-1`, `manual-1`, `manual-2`, `manual-3`) and correctly visualizes slot `auto-1` as "Auto Save" (or "Auto Salvar") if it contains save data, or shows "Empty Slot" if it doesn't, rather than omitting it.

3. R5: Secret Developer Mode Panel (DevMode)
   - In `mobile/src/ui/screens/MainMenuScreen.tsx`, make the "EPOCHS" title clickable. Implement a 5-tap sequence counter within 1 second that toggles the visibility of the secret Developer Mode overlay.
   - Build this Developer Mode overlay panel/modal with a dark background (`#0D1117`).
   - Implement the following 9 tools linked directly to the `GameSession`:
     - **a) Fog of War Toggle**: Toggles Fog of War. Ensure map screen visualizes everything when disabled. Look at how fog is calculated or rendered. If needed, add a `fogOfWarDisabled: boolean` in `gameState.meta` or session state, and check it in map screen visibility rendering.
     - **b) +1000 Recursos**: Buttons to add +1000 of Gold, Wood, Iron, Food, Faith, Legitimacy, Manpower, and Wealth. Ensure it writes to the ECS state arrays for player kingdom capital region, legacy stocks, and reserve manpower/personal wealth.
     - **c) Completar Pesquisa/Construção**: A button to instantly finish the currently active technology research (e.g., setting accumulatedResearch to node cost or unlocking it immediately).
     - **d) Desbloquear Todas as Eras**: Unlock all technologies in the game (populate `player.technology.unlocked` with all technology IDs).
     - **e) Visualizador de Decisões da IA**: Renders a list of NPC kingdoms, showing their current strategic focus (e.g., "Expandir", "Construir Exército"), active target, and reason.
     - **f) Assumir Controle de Outra Civilização**: Dropdown with NPC kingdoms. Selecting one switches `playerKingdomId` to it by swapping the `isPlayer` flag between kingdoms in `gameState.kingdoms`, disabling NPC state for the new player, and enabling NPC state for the old player.
     - **g) Modo Simulação Rápida (Autoplaying)**: Toggle autoplay. Accelerates simulation speed to 100x temporarily (extend `setSpeed` max to 100, and modify `tickDurationMs`) and sets the player kingdom to NPC control temporarily so it plays itself.
     - **h) Matriz de Relacionamento**: A visual grid/table of diplomatic relationships between all kingdoms (trust, fear, rivalry scores and status).
     - **i) Simulador de Combate Rápido**: inputs for choosing two kingdoms and simulating a fast combat between them, rendering predicted casualties/outcome without modifying the actual state.
   - When DevMode is active, display a clear warning banner/label "MODO DESENVOLVEDOR ATIVO" in the UI (e.g., at the top of the screen or in HUD/menu).

4. R6: Performance Audit & Cleanup
   - Await the `triggerAutosave()` or `forceSaveToDisk()` promise inside `GameProvider.tsx` background event handler.
   - Fix the `[SYS-PERF]` CPU debt warnings on resume. In `resumeFromBackground()` in `game-session.ts`, instead of dumping all catch-up milliseconds into `accumulatedMs` at once (which triggers the warning and discards backlog), process the catchup in batch ticks or chunk increments and reset `accumulatedMs`. Also adjust the 120,000ms safety clamp so it doesn't trigger under normal high-speed usage (scale it with speed multiplier).
   - Find all leftover English UI texts (especially in `mobile/src/ui/screens/character-creation/...` or general screens) and translate them to Portuguese (default).
   - Fix the memory leak in `GameProvider.tsx` by storing the unsubscribe callback returned by `newSession.subscribe(...)` and calling it on component unmount.
   - Verify that typescript compiles successfully (`npx tsc --noEmit` or `npm run build` passes) and vitest unit/integration tests run and pass.

Write a summary of changes, build output, and test execution results to handoff.md in your working directory. Send a message to the orchestrator (conversation ID: 64ba23d1-8721-4da6-a847-0e30f08685fd) when complete.
