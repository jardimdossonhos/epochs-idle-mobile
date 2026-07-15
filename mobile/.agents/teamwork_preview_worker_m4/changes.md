# Changes Made for Milestone 4 (LLM Diplomacy: R8)

## 1. DiplomacyState / BilateralRelation Update
- **File**: `src/core/models/diplomacy.ts`
- **Changes**: Added the `chatHistory` optional array property to the `BilateralRelation` interface:
  ```typescript
  chatHistory?: Array<{ sender: 'player' | 'npc' | 'narrator'; text: string; timestamp: number }>;
  ```

## 2. GeminiService Update
- **File**: `src/application/ai/gemini-service.ts`
- **Changes**:
  - Defined localized offline fallback dialogue structures (`OFFLINE_CHAT_FALLBACKS` and `OFFLINE_CHAT_FALLBACKS_EN`) mapped by relationship status.
  - Implemented the `chatWithSovereign` method to formulate a detailed sovereign profile and relationship prompt, call the Gemini API REST endpoint using the configured key (setting `responseMimeType: "application/json"` in `generationConfig` to request structured output), parse the JSON result for dialogue/action, and fall back gracefully to offline templates returning `action: 'NO_ACTION'` if the key is missing or the call fails/times out.

## 3. GameSession Update
- **File**: `src/application/game-session.ts`
- **Changes**:
  - Imported `geminiService` from `./ai/gemini-service`.
  - Implemented `sendPlayerChatMessage(targetKingdomId, message)` to verify the existence of the target kingdom and its ruler, retrieve or initialize the bilateral `chatHistory`, append the player's message, call `geminiService.chatWithSovereign`, append the response to history, limit history size to 10 messages, execute autonomous actions (war/peace/alliance) in the engine without costing player resources, persist the state, and return the response dialogue.

## 4. DiplomacyScreen UI Update
- **File**: `src/ui/screens/DiplomacyScreen.tsx`
- **Changes**:
  - Imported `TextInput`, `ActivityIndicator`, `AvatarRenderer`, and `SOVEREIGN_TRAITS`.
  - Replaced the default avatar placeholder in both the list and the details view with the `AvatarRenderer` component.
  - Rendered detailed sovereign profile cards displaying name, title, traits (mapped to user-friendly names via `SOVEREIGN_TRAITS`), and stats (administration, martial, diplomacy, intrigue, learning).
  - Added a Chat Panel rendering the ScrollView message history, a styled `TextInput` with loading state, and a Send button. Included retry styling and functionality for connection timeouts/errors.

## 5. Verification tests
- **File**: `test-sprint3-diplomacy.ts` (new file)
- **Changes**: Wrote an isolated unit test suite covering `chatWithSovereign` fallback, input validation, message history capping, and autonomous action triggers (DECLARE_WAR) under raw Node.js with an `AsyncStorage` module mock.
