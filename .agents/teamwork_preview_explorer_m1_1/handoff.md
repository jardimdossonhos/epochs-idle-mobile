# Handoff Report: Milestone 1 Architecture & Implementation Strategy (m1_onboarding)

## 1. Observation

During our comprehensive read-only investigation of the Epochs Idle repository, we observed the following structural components and runtime mechanics:

### A. UI Structure & App Lifecycle
- **Root Entry Point (`mobile/App.tsx`)**:
  - Lines 136-146: `App` wraps `AppContent` inside `SafeAreaProvider`, `GameProvider`, and `NavigationContainer` (with `EmpireTheme`).
  - Lines 148-162: `AppContent` executes a synchronous gate `if (!gameState) return <SplashScreen />;`. Once `gameState` is non-null, it renders `<TopHUD />`, `<MainTabs />`, and `<EventPopup />`.
  - Lines 35-134: `MainTabs` initializes bottom tab navigation for `Tech`, `Map`, `Government`, `Diplomacy`, `Characters`, and `Menu`.
  - **Direct Evidence**: There is currently **no authentication screen**, **no launcher main menu**, and **no character creation screen** in the application startup pipeline.

### B. GameSession & State Persistence
- **Engine Provider (`mobile/src/ui/GameProvider.tsx`)**:
  - Lines 72-134: `useEffect` initializes `GameSession` on mount and immediately triggers `initGame()`, calling `createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1)` and `newSession.bootstrap(initialState)`.
  - Lines 127-128: `newSession.start()` is invoked right after bootstrapping, starting the engine clock immediately.
- **Save & Load Infrastructure (`mobile/src/infrastructure/persistence/MobileGameStateRepository.ts` & `save-slots.ts`)**:
  - `MobileGameStateRepository` handles single active game persistence at `epochs_idle_current.json`.
  - `MobileSaveRepository` manages slot-based saves (`epochs_save_${slotId}.json`). Known slot IDs defined in `save-slots.ts` (line 1) are `auto-1`, `manual-1`, `manual-2`, `manual-3`, `safety-1`.
  - `GameSession` (`mobile/src/application/game-session.ts`) exposes async methods `listSaveSlots()`, `loadSlot(slotId: SaveSlotId)`, and `saveManual(slotId: SaveSlotId)`.

### C. Character Creation, Cultures & Avatars
- **Culture Definitions (`mobile/src/core/simulation/systems/culture-generator.ts`)**:
  - Lines 1-53: Defines 9 historical culture IDs in `DEFAULT_CULTURES`: `'nordic'`, `'latin'`, `'eastern'`, `'desert'`, `'celtic'`, `'slavic'`, `'savanna'`, `'indigenous'`, `'vedic'`.
  - Lines 4-50: `CULTURES` registry contains lists of male names, female names, and honorific titles for all 9 cultures.
- **Character Domain Model (`mobile/src/core/models/character.ts`)**:
  - Lines 3-9: `CharacterStats` includes `administration`, `martial`, `diplomacy`, `intrigue`, `learning`.
  - Lines 18-38: `Character` interface includes `id`, `name`, `cultureId`, `portraitSeed`, `gender`, `isLegendary`, `stats`, `traits`, `affinity`, etc.
- **Avatar Rendering (`mobile/src/ui/screens/CharacterScreen.tsx`)**:
  - Lines 142-157: `getAvatarUrl()` maps `cultureId` to DiceBear 9.x styles (`lorelei`, `adventurer`, `avataaars`, `micah`) and builds a remote HTTP URL (`https://api.dicebear.com/9.x/...`).
  - Lines 159-175: `DynamicAvatar` displays an `<Image>` with fallback to emoji icons on image load failure (`onError`).
  - **Dependencies (`mobile/package.json`)**: Dependencies include `react`, `react-native`, `expo`, `@react-native-async-storage/async-storage`, and `@react-navigation/*`. Note: `react-native-svg` is **not currently installed**.

---

## 2. Logic Chain

From the observed codebase state to our architectural recommendations:

1. **Root Navigation Decoupling**:
   - *Observation*: Currently, `GameProvider` starts the `GameSession` clock immediately on app launch, bypassing any menu or auth.
   - *Logic*: To introduce Google Login, a Main Menu, and Character Creation without corrupting the ECS simulation state or running ticks in the background while in menus, we must separate the App Navigation State (`Auth`, `MainMenu`, `CharacterCreation`, `Game`) from `GameSession` ticking. `GameSession.start()` should only be called once the player selects "Continue" or finishes Character Creation.

2. **Google Authentication Strategy**:
   - *Observation*: The project needs both dev/offline testing and real Google login.
   - *Logic*: Adopting a clean abstraction layer (`IAuthService` interface) allows `MockAuthService` to function during offline development without network calls, while `GoogleAuthService` (leveraging `expo-auth-session` / `@react-native-google-signin/google-signin`) handles OAuth tokens. Auth state will persist locally via AsyncStorage.

3. **Standalone Main Menu & Slot Management**:
   - *Observation*: `MenuScreen.tsx` is currently an in-game tab containing save/load cards and speed controls.
   - *Logic*: The new `MainMenuScreen` will act as the primary entry hub after authentication. It will display user profile info, a "New Game" button (navigating to Character Creation), a "Load Game" modal/list utilizing `MobileSaveRepository.listSlots()`, and Settings. The existing in-game menu will remain as an in-game pause/settings drawer.

4. **Character Creation Wizard (4-Step Pipeline)**:
   - *Observation*: `culture-generator.ts` provides 9 cultures, `character.ts` defines 5 stats, and `create-initial-state.ts` supports dynamic starting territory injection (`playerStartRegionId`).
   - *Logic*: We can build a modular 4-step wizard (`CultureSelectStep` -> `StatPointBuyStep` -> `TerritorySelectStep` -> `AvatarAppearanceStep`).
   - *DiceBear & Offline SVG*: Because mobile clients may run offline or in poor network conditions, relying purely on remote DiceBear PNG URLs causes avatar pop-in or blank boxes. Installing `react-native-svg` and creating a local SVG avatar renderer (or embedding local SVG fallback assets) guarantees immediate offline avatar rendering.

---

## 3. Caveats

- **Network Mode**: The investigation was conducted strictly in CODE_ONLY mode. External npm package installations (e.g. `react-native-svg`, `@react-native-google-signin/google-signin`) will need to be performed by the implementer in an environment with package manager access.
- **Expo Prebuild / Native Modules**: Real Google Sign-In on mobile natively requires client IDs generated in Google Cloud Console (`google-services.json` for Android). Mock mode ensures full functionality during local testing without cloud credentials.
- **Web Worker Compatibility**: The game session currently runs on the React Native JS thread (`markWorkerReady()` called synchronously). Changing state boot routines must ensure React state shallow cloning rules (`setGameState({ ...newState })`) are preserved.

---

## 4. Conclusion & Architectural Strategy

### Architecture Overview

```
[ App Launch ]
      │
      ▼
┌──────────────┐      Not Authenticated      ┌──────────────────┐
│ SplashScreen │ ──────────────────────────► │    AuthScreen    │
└──────────────┘                             │ (Google / Mock)  │
      │                                      └──────────────────┘
      │ Authenticated                                 │
      ▼                                               │ Authenticated
┌─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────┐
│                        MainMenuScreen                           │
├─────────────────────────────────────────────────────────────────┤
│  [ Profile Header ]  [ ⚔️ New Game ]  [ 📜 Load Game ]  [⚙️ Opt] │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ New Game                           │ Load Selected Slot
         ▼                                    ▼
┌──────────────────────────┐       ┌──────────────────────────────┐
│ CharacterCreationWizard  │       │     Boot Existing Slot       │
│  1. Culture Selection    │       │   (GameSession.loadSlot)     │
│  2. Point Buy Stats      │       └──────────────────────────────┘
│  3. Territory Picker     │                      │
│  4. Avatar Customizer    │                      │
└──────────────────────────┘                      │
         │                                        │
         │ Complete Creation                      │
         ▼                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                           GameScreen                            │
│                  (TopHUD + MainTabs Engine UI)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Detailed Implementation Plan

#### Component 1: Google Sign-In Authentication Flow
- **File Structure to Create**:
  - `mobile/src/application/auth/auth-types.ts`: User interface (`AuthUser`), AuthStatus enum (`unauthenticated`, `authenticated_guest`, `authenticated_google`).
  - `mobile/src/application/auth/auth-service.ts`: `IAuthService` contract interface.
  - `mobile/src/application/auth/mock-auth-service.ts`: Dev/offline implementation offering instant login with configurable mock profiles.
  - `mobile/src/application/auth/google-auth-service.ts`: Production Google Sign-In wrapper using `expo-auth-session` / Google API.
  - `mobile/src/ui/context/AuthContext.tsx`: React context managing login state, token persistence in AsyncStorage, and active auth provider switching.
  - `mobile/src/ui/screens/AuthScreen.tsx`: Sleek medieval-themed authentication screen with "Sign in with Google" button, "Offline / Dev Mode" toggle, and "Continue as Guest" option.

#### Component 2: Main Menu Overhaul & Load Game Integration
- **File Structure to Create/Modify**:
  - `mobile/src/ui/screens/MainMenuScreen.tsx`: Standalone main menu screen.
  - `mobile/src/ui/components/LoadGameModal.tsx`: Slot list modal component displaying save details.
- **Implementation Strategy**:
  - Update `App.tsx` root navigation state machine (`appState: 'splash' | 'auth' | 'main_menu' | 'character_creation' | 'in_game'`).
  - `MainMenuScreen` feature set:
    - **Header**: Displays player avatar, display name, and auth provider badge.
    - **New Game Button**: Navigates to `character_creation`.
    - **Load Game Button**: Triggers `LoadGameModal`, fetching active slots via `session.listSaveSlots()`. Cards present Kingdom Name, Culture Icon, Current Year (`Math.floor(tick / 12) + 1`), and timestamp formatted via `new Date(savedAt).toLocaleDateString()`.
    - **Direct Game Launch**: Selecting a slot executes `await session.loadSlot(slotId)`, sets `appState` to `in_game`, and calls `session.start()`.

#### Component 3: Character Creation Wizard & Offline SVG Avatars
- **File Structure to Create**:
  - `mobile/src/ui/screens/character-creation/CharacterCreationScreen.tsx`: Master container managing step state (`step: 1 | 2 | 3 | 4`).
  - `mobile/src/ui/screens/character-creation/steps/CultureSelectStep.tsx`: Grid displaying all 9 historical cultures from `culture-generator.ts` with description cards, trait attributes, and naming samples.
  - `mobile/src/ui/screens/character-creation/steps/StatPointBuyStep.tsx`: Interactive stat allocator.
    - Baseline stats: 3 in all 5 categories (`ADM`, `MAR`, `DIP`, `INT`, `LRN`).
    - Attribute Pool: 15 free points to distribute (Max 10 per stat).
    - Includes archetype/trait selection (e.g., "Ambitious", "Scholar", "Tactician").
  - `mobile/src/ui/screens/character-creation/steps/TerritorySelectStep.tsx`: Filtered region selector allowing player to pick their capital hex (`playerStartRegionId`) based on starting biomes (Temperate, Arid, Steppe, Coastal).
  - `mobile/src/ui/screens/character-creation/steps/AvatarAppearanceStep.tsx`: DiceBear seed randomizer and style customizer.
  - `mobile/src/ui/components/AvatarRenderer.tsx`: Component supporting both remote DiceBear URLs and offline SVG rendering/fallback using `react-native-svg`.
- **Game Engine Injection Strategy**:
  - Upon completing step 4, call `createInitialState(staticWorldData, selectedRegionId, WORLD_DEFINITIONS_V1)`.
  - Inject custom ruler stats, name, cultureId, and portraitSeed into `state.world.characters[rulerId]` and `state.kingdoms['k_player']`.
  - Boot `GameSession` with custom state, save to `epochs_idle_current.json`, and transition to `in_game`.

---

## 5. Verification Method

To independently verify the implementation once built, perform the following verification steps:

1. **Auth Flow Verification**:
   - Launch application. Verify app displays `AuthScreen` rather than auto-starting game simulation ticks.
   - Click "Dev / Mock Login". Verify `AuthContext` state updates to `authenticated` and navigates to `MainMenuScreen`.
   - Test persistence: Close app, re-open, confirm user bypasses `AuthScreen` directly to `MainMenuScreen`.

2. **Main Menu & Save/Load Verification**:
   - On `MainMenuScreen`, click "Load Game". Verify slot list accurately parses saved snapshots from `FileSystem.documentDirectory`.
   - Click an existing slot. Verify `GameSession.loadSlot()` executes without throw, state updates, and UI transitions smoothly to `GameScreen` with running clock.

3. **Character Creation & Avatar Verification**:
   - On `MainMenuScreen`, click "New Game". Verify wizard advances sequentially through steps 1 to 4.
   - Modify point buy values. Verify budget counter decrements correctly and prevents allocation exceeding 15 points.
   - Disconnect network / test offline mode. Confirm `AvatarRenderer` successfully renders offline SVG fallback without broken image icons or network timeouts.
   - Complete creation. Inspect `session.getState().kingdoms['k_player']` and `session.getState().world.characters` to verify chosen culture, name, stats, and capital region match wizard choices.

4. **Automated Test Suite**:
   - Run `npm test` from project root to ensure core domain systems and state schemas remain 100% compliant with existing Vitest specifications.
