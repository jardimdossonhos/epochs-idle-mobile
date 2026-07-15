# Handoff Report: AI Sovereigns and Chat Diplomacy (Sprint 3)

## 1. Observation
I searched and investigated the Epochs Idle mobile codebase and observed the following files and code snippets:
1. **NPC Models**: `src/core/models/npc.ts` defines `NpcPersonality` (archetype, ambition, caution, greed, zeal, honor, betrayalTendency) and `NpcBehaviorState`.
2. **Diplomacy Models**: `src/core/models/diplomacy.ts` defines `BilateralRelation` and `DiplomacyState` containing relation scores (trust, fear, rivalry, etc.).
3. **Character Models**: `src/core/models/character.ts` defines `Character` (stats: administration, martial, diplomacy, intrigue, learning; traits: string[]; status: CharacterStatus; portraitSeed, etc.).
4. **Sovereign Generation**: `src/application/boot/create-initial-state.ts` creates initial rulers using `createInitialCharacter` (lines 596-642) by querying `generateCulturalName`, `generatePortraitSeed` and `getRandomGender` from `src/core/simulation/systems/culture-generator.ts`. Traits are currently static: `traits: title !== "Soberano" ? ["nobre", "herdeiro"] : ["nobre"]`.
5. **Gemini Service**: `src/application/ai/gemini-service.ts` implements a basic `GeminiService` class supporting connection testing, event narrative generation, and fallback offline text interpolation. It does not contain any conversation history tracking or engine action-triggering parsing mechanisms.
6. **Avatar/Photo Rendering**: `src/ui/components/AvatarRenderer.tsx` uses Dicebear APIs via HTTP GET (lines 37-52) based only on `cultureId` and `seed` (e.g. `https://api.dicebear.com/9.x/${style}/png?seed=${safeSeed}...`), completely ignoring the ruler's `gender` property and missing specific phenotype mapping.
7. **Diplomacy UI**: `src/ui/screens/DiplomacyScreen.tsx` displays relation metrics (trust, fear, rivalry) and buttons for direct player-triggered diplomatic actions. There is no chat panel to converse with the sovereign.

## 2. Logic Chain
To address requirements R6 and R8:
1. **Randomized Sovereign Generation (R6)**:
   * **Evidence**: Current rulers have static traits `["nobre"]` and deterministic personalities based on `NpcArchetype` configuration.
   * **Reasoning**: We need to define a trait catalog (`SOVEREIGN_TRAITS`) that modifies stats (e.g. `martial: +2` for Militarista) and modifies NPC behavior values (e.g. `ambition: +0.15`). Applying these when characters are initialized in `createInitialState` and heirs are created in `generateHeir` will give each sovereign a distinct gameplay profile. Adding a random variance (e.g. `±0.12`) to base archetypes will make every kingdom behave uniquely.
   * **Portrait Phenotypes**: By mapping `cultureId` to specific skin, hair, and facial options in `AvatarRenderer.tsx` and disabling facial hair when `gender === 'female'`, we ensure the generated photos respect culture, gender, and phenotype.
2. **Chat Diplomacy & Autonomous Engine Actions (R8)**:
   * **Evidence**: Current diplomacy actions are instant button clicks and Gemini integration is non-interactive.
   * **Reasoning**: We must store `chatHistory` inside `BilateralRelation` to persist chat messages. When a player sends a message, `GeminiService` will format a prompt containing the player's message, the chat history, sovereign traits/stats, and current kingdom power values.
   * **Autonomy**: Gemini will be instructed to return a structured JSON with a `"dialogue"` text and an `"action"` field (`"DECLARE_WAR" | "MAKE_PEACE" | "COOPERATIVE_AGREEMENT" | "NO_ACTION"`). If the LLM returns an action, a new method `executeNpcChatAction(...)` in `GameSession` will execute the action (declaring war, making peace, or applying treaty decisions) without charging the player resource costs.

## 3. Caveats
* **Gemini API Availability**: The sovereign chat is highly dependent on a valid Gemini API Key and an active internet connection. Offline fallbacks must be robust to ensure game progression does not break if a connection timeout occurs.
* **JSON Parsing Resilience**: LLMs can occasionally return malformed JSON despite `responseMimeType: "application/json"`. The implementation must wrap the parser in a try-catch block and default gracefully to `NO_ACTION` and offline dialogue.

## 4. Conclusion
Sprint 3 R6 and R8 can be fully integrated into the existing data model, simulation pipeline, and UI without introducing breaking changes:
* Implement randomized traits and portrait generation in `create-initial-state.ts` and `AvatarRenderer.tsx`.
* Add `chatHistory` to `BilateralRelation`.
* Implement a JSON-schema-based `chatWithSovereign` method in `GeminiService` and connect its output actions to `GameSession.executeNpcChatAction`.
* Design and append the Chat panel UI component in `DiplomacyScreen.tsx`.

## 5. Verification Method
1. **Compilation**: Verify the project compiles without errors using `npx tsc --noEmit`.
2. **Sovereign Inspection**: Launch the game (`npm run start` or `npm run web`), navigate to the Diplomacy Screen, and check that:
   * The selected kingdom's sovereign photo (respecting culture/gender/phenotype) and stats/traits are correctly visible.
   * The Chat panel renders correctly.
3. **Diplomacy Chat Test**: Write messages to the sovereign and check:
   * Responses are generated via Gemini (if API Key is configured) or offline fallbacks.
   * Action triggering works (e.g. insulting a militaristic sovereign triggers `DECLARE_WAR`, which sets the relation status to Hostile and logs a global war event).
