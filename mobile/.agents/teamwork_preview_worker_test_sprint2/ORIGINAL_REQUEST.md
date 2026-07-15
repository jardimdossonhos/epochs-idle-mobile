## 2026-07-08T11:23:43Z

You are a worker agent. Your task is to implement and run the 2000-Year Headless simulation test (Milestone 6) for Epochs Idle mobile.

Please perform the following tasks:
1. Create `test-2000-years.ts` in the project root (mirroring `test-boot.ts` but adapting it to run the 2000-year simulation).
2. The simulation should run for exactly 2000 years (which is `2000 * 12 = 24,000` ticks).
3. The test execution loop should:
   - Call `newSession.bootstrap(initialState)` to initialize the session.
   - Advance the simulation by running 24,000 ticks in batches (e.g. calling `newSession.advanceTimeForTesting(3000)` 24,000 times, or in chunks).
   - Track and log state at milestones (e.g., Year 100, 500, 1000, 1500, 2000).
   - Collect and log events.
4. The test log must explicitly print, verify, and mathematically prove the following acceptance criteria:
   - No freezes in the main loop (proves liveness by completing the run).
   - AI kingdoms conquered empty regions independently (log region ownership counts for each kingdom at start and end. Compare them to prove expansion).
   - Eras (Years) and Technologies were unlocked in the correct periods (log when each technology is unlocked by kingdoms during the 2000 years).
   - Diplomatic trust and rivalry metrics differ between kingdoms (log sample bilateral values, e.g., NPC1 -> NPC2 and NPC2 -> NPC1, to prove asymmetry and independent evolution).
   - Court characters (ruler, candidates, heirs) were generated and successfully age/succeed (log the final list of characters, ages, and heir counts).
5. Compile and run the test:
   - Compile: `npx tsc test-2000-years.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule`
   - Run: `node dist-test/test-2000-years.js`
   - Capture the full output log and save it to a log file or write it in your handoff report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes, execution logs, and output results to handoff.md in your working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_test_sprint2
