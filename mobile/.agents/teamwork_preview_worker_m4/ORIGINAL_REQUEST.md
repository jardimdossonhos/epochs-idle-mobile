## 2026-07-13T14:53:45Z

Your task is to implement Milestone 4 (LLM Diplomacy: R8) in Epochs Idle.

SPECIFICATIONS:

1. DiplomacyState / BilateralRelation Update:
   - In `src/core/models/diplomacy.ts`, update `BilateralRelation` to include:
     `chatHistory?: Array<{ sender: 'player' | 'npc' | 'narrator'; text: string; timestamp: number }>`
     to support storing the message history.

2. GeminiService Update:
   - In `src/application/ai/gemini-service.ts`, implement a method:
     `async chatWithSovereign(rulerName: string, rulerTitle: string, cultureId: string, traits: string[], stats: any, personality: any, relation: any, message: string, chatHistory: any[]): Promise<{ dialogue: string, action: 'DECLARE_WAR' | 'MAKE_PEACE' | 'MAKE_COOPERATION_AGREEMENT' | 'NO_ACTION' }>`
     - Formulate a prompt describing:
       - The sovereign's profile (name, title, culture, traits, and personality scores like greed, honor, caution, zeal, ambition, betrayalTendency).
       - The current relationship scores (trust, fear, rivalry).
       - The conversation history between the sovereign and the player.
       - The new player message.
     - Instruct Gemini to act as this sovereign and output a reply in the appropriate medieval tone, matching the ruler's personality.
     - Instruct Gemini to return a structured JSON object:
       `{ "dialogue": "...", "action": "DECLARE_WAR | MAKE_PEACE | MAKE_COOPERATION_AGREEMENT | NO_ACTION" }`
       Note: Set `responseMimeType: "application/json"` in the fetch payload config generationConfig.
     - If the Gemini API key is missing, or if the API call fails or times out, fallback gracefully to a localized offline response using offline templates matching the sovereign's stance, returning `action: 'NO_ACTION'`.

3. GameSession Update:
   - In `src/application/game-session.ts`, implement:
     `async sendPlayerChatMessage(targetKingdomId: string, message: string): Promise<string>`
     - Verify target kingdom and target ruler exist.
     - Retrieve/initialize `relation.chatHistory` (as an array).
     - Append the player's message: `{ sender: 'player', text: message, timestamp: Date.now() }`.
     - Request the response from `geminiService.chatWithSovereign` passing the ruler, traits, stats, relationship metrics, and chat history.
     - Parse the JSON response.
     - Append the sovereign's response: `{ sender: 'npc', text: response.dialogue, timestamp: Date.now() }`.
     - Limit the `chatHistory` size to a maximum of 10 messages (discarding the oldest messages if it exceeds 10) to preserve memory and keep prompts clean.
     - Parse `response.action`. If it is not `'NO_ACTION'`:
       - Trigger the corresponding diplomatic command in the engine autonomously (without costing the player resources/costs) using the session's internal state mechanisms or resolving peace/war/alliance directly. (Ensure you do not declare war on player self, and handle errors gracefully).
     - Save the game state and emit the update.
     - Return the response dialogue string.

4. DiplomacyScreen UI Update:
   - In `src/ui/screens/DiplomacyScreen.tsx`:
     - Replace the avatar placeholder in the list and details panel with the `AvatarRenderer` component:
       `<AvatarRenderer cultureId={ruler?.cultureId} seed={ruler?.portraitSeed} gender={ruler?.gender} size={48} />`
       (Make sure to import `AvatarRenderer` correctly, and handle undefined values gracefully).
     - In the `isSelected` detail panel, display the selected sovereign ruler's name, title, traits (map the trait IDs from `ruler.traits` via `SOVEREIGN_TRAITS` to get the user-friendly names), and their 5 stats (administration, martial, diplomacy, intrigue, learning).
     - Add a Chat Panel inside the `isSelected` detail panel:
       - Renders chat message history between player and the sovereign.
       - A TextInput for typing a message.
       - A "Send" button to dispatch the message.
       - Handles loading/typing states, and handles connection timeout/errors gracefully showing a retry state.
       - Uses `session.sendPlayerChatMessage(id, message)` to interact with the game engine.

Run typescript compilation check and E2E tests to verify your implementation:
- `npx tsc --noEmit`
- `npx tsc test-sprint3-e2e.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule && node dist-test/test-sprint3-e2e.js`

Write your changes to changes.md and completion report in handoff.md in your working directory. Report back when done.
