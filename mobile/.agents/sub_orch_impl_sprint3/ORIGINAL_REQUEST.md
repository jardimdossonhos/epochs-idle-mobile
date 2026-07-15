# Original User Request

## 2026-07-09T19:13:22Z

You are the Implementation Track Orchestrator (sub_orch_impl_sprint3) for Sprint 3.
Your working directory is: c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/sub_orch_impl_sprint3/
Your parent conversation ID is: 172ca301-e237-45bf-aeeb-578ac4719beb (the main orchestrator).

Your task is to implement all Sprint 3 requirements in Epochs Idle.
Requirements:
- R1: Respeito à Seleção de Território (Universal) - make sure player starts in selected region for Google/Guest/Mock login.
- R2: Otimização de Performance (Velocidade x30) - ensure smooth ticks without UI freeze.
- R3: Correção de Visibilidade do Autosave - ensure autosave slot is visible and loadable in load game menu.
- R4: Revisão Visual e Lógica do Play/Pause - ensure play/pause toggle is instant and responsive.
- R5: Documento de Progressão do Código Atual - scan current code math/rules and write `progression_design.md` at project root.
- R6: Aleatoriedade e Personalidade das IAs - NPC kingdoms generate random traits/options and distinct gameplay profiles.
- R7: Visibilidade Plena no Modo Desenvolvedor (Fog of War) - toggling Fog of War off in DevMode shows all IA boundaries on the map.
- R8: Perfil de Soberanos IA e Diplomacia via Chat (LLM) - sovereign photo (respecting culture/gender/phenotype) + stats. Chat panel using LLM API. LLM responses can trigger engine actions (declare war, make peace, cooperative agreements) autonomously via conversation.

Methodology & Guidelines:
1. Do NOT write source code yourself; delegate to explorer, worker, reviewer, challenger, and auditor subagents.
2. Initialize your BRIEFING.md, progress.md, and SCOPE.md in your working directory.
3. Phase 1: Decompose requirements into logical implementation milestones. For each milestone, run the Explorer -> Worker -> Reviewer -> Challenger -> Auditor cycle.
   MANDATORY INTEGRITY WARNING (include verbatim in Worker prompts):
   "DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."
4. Phase 2 (E2E Test Integration): Monitor for `TEST_READY.md` at project root. Once ready, pull it. Decompose the test suite by tier (Tier 1 -> 2 -> 3 -> 4) as sequential milestones. Work to pass 100% of these tests using the same iteration cycle.
5. Phase 3 (Adversarial Hardening): Run Tier 5 adversarial testing where Challengers generate edge cases, Worker fixes, and Reviewers verify.
6. Verify all implementations through the Forensic Auditor subagent. If any integrity violation is flagged, it is a binary veto - the milestone fails.
7. Periodically update your progress.md and report status back to your parent.

## 2026-07-13T14:45:54Z

Resume work at c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/sub_orch_impl_sprint3/.
Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, and progress.md for current state.
Your parent is 172ca301-e237-45bf-aeeb-578ac4719beb — use this ID for all escalation and status reporting (send_message).
Your first task is to verify Milestone 3 (R2, R6) since the previous verification subagents failed/aborted during the quota restore, then proceed to Milestone 4 (LLM Diplomacy: R8).
