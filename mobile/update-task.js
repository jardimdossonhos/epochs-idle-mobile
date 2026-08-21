const fs = require('fs');
let code = fs.readFileSync('C:/Users/joti.SIMPLO/.gemini/antigravity/brain/178f7026-7650-48ed-833d-5455d2c5a28c/task.md', 'utf8');

code = code.replace(/\[\/\].*Task 1 - Initial Region Spawn Bug.*/, "[x] Phase 1.5, Task 1 - Initial Region Spawn Bug: Fixed. Implemented resolveInitialSpawn avoiding poles and bounding boxes to the respective continent.");
code = code.replace(/\[ \].*Task 2 - \"New Game\" from Settings.*/, "[x] Phase 1.5, Task 2 - \"New Game\" from Settings: Fixed. Now uses DeviceEventEmitter to emit 'navigateTo' -> 'character_creation' avoiding raw resets.");
code = code.replace(/\[ \].*Task 3 - UI Calendar.*/, "[x] Phase 1.5, Task 3 - UI Calendar: Fixed. TopHUD now renders 'Ano X' and 'Mês Y' beside the Play/Pause button.");
code = code.replace(/\[ \].*Task 4 - Colonization Diagnostic.*/, "[x] Phase 1.5, Task 4 - Colonization Diagnostic: Added DENIED_REASON logs to executeRegionAction and improved adjacency checking using ecs.regionOwner!");
code = code.replace(/\[ \].*Task 5 - UTF-8.*/, "[x] Phase 1.5, Task 5 - UTF-8: Diagnosed mojibake caused by LLM tooling double-encoding. Created fix script that cleanly restored all src/ files, and added unit test to prevent regression.");
code = code.replace(/\[ \].*Task 6 - Economy Audit.*/, "[x] Phase 1.5, Task 6 - Economy Audit: Added [AUDIT-ECONOMY-LIFECYCLE] in createInitialState, GameProvider, and EconomySystem.");
code = code.replace(/\[ \].*Task 7 & 8.*/, "[x] Phase 1.5, Task 7 & 8: Maintained only necessary logs, wrote extensive unit tests for spawn and utf-8, ran npm run verify.");

fs.writeFileSync('C:/Users/joti.SIMPLO/.gemini/antigravity/brain/178f7026-7650-48ed-833d-5455d2c5a28c/task.md', code, 'utf8');