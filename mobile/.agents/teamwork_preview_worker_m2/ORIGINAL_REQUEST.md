## 2026-07-09T19:18:50Z
Implement Sprint 3 requirements:
- R1: Respeito à Seleção de Território (Universal) - make sure player starts in selected region for Google/Guest/Mock login.
- R3: Correção de Visibilidade do Autosave - ensure autosave slot is visible and loadable in load game menu.
- R4: Revisão Visual e Lógica do Play/Pause - ensure play/pause toggle is instant and responsive.
- R7: Visibilidade Plena no Modo Desenvolvedor (Fog of War) - toggling Fog of War off in DevMode shows all IA boundaries on the map.

Additionally, resolve the following 3 TypeScript errors during compilation:
1. `src/core/simulation/systems/character-system.ts`: add missing Character properties (`level`, `experience`, `unspentTalentPoints`) to character templates/mocks.
2. `src/infrastructure/persistence/save-schema.ts`: add missing Character properties (`level`, `experience`, `unspentTalentPoints`) to character templates/mocks.
3. `src/ui/components/WorldMapSkia.tsx`: add a type annotation like `neighborId: string` to parameter `neighborId` at line ~280.
