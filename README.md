# Epochs Idle — Grand Strategy & ECS Simulation Engine

**Epochs Idle** is an immersive, grand-strategy idle/simulation game built with **React Native (Expo)** and a high-performance **Entity-Component-System (ECS)** simulation engine written in TypeScript.

---

## 1. Executive Summary & Current Status

### Development Stage
* **Status:** **Alpha / Stable Build (Android NDK & JS Runtime Verified)**
* **Current Milestone:** M1 (Core Engine & Government UI Refactoring Completed; Native Android Build Operational)
* **Latest Verifications:**
  * Clean NDK/C++ compilation via Ninja/CMake (599 Gradle tasks verified).
  * Stable Metro Bundler integration and runtime execution on Android (`Pixel_8` emulator / physical devices).
  * Zero-crash JavaScript boot sequence (Expo SDK 56 verified).

---

## 2. Architecture & Design Patterns

The repository is structured around a strict separation of concerns between the **Deterministic Simulation Engine (`mobile/src/core/`)** and the **Reactive UI Layer (`mobile/src/ui/`)**.

```
mobile/
├── src/
│   ├── core/                  # Deterministic Simulation Engine
│   │   ├── ecs/               # ECS State, Bitmasks, Component Pools, Object Pools
│   │   ├── models/            # Object-Oriented Domain Models (TaxPolicy, BudgetPriority, etc.)
│   │   ├── simulation/        # Systems (Economy, Military, Diplomacy, Automation, Events)
│   │   └── systems/           # Higher-level Game Systems (Vision, Conquest, BotSystem)
│   └── ui/                    # React Native UI Layer
│       ├── GameProvider.tsx   # Engine Bridge & Throttled Sync Coordinator (4 FPS)
│       ├── screens/           # Game Screens (GovScreen, MapScreen, DiplomacyScreen, etc.)
│       └── store/             # Zustand Reactive Store (game-store.ts)
```

### Key Architectural Standards

1. **ECS-to-OO Bridge (`GameSession`)**
   * The core simulation runs on flat typed arrays and ECS component bitmasks for optimal memory locality and speed.
   * `GameSession` translates raw ECS entities into rich Object-Oriented domain models before exposing them to the UI layer.

2. **Throttled State Synchronization (Zustand & `syncInterval`)**
   * To prevent React re-render cascades ("Maximum update depth exceeded"), UI components **never** read mutable simulation state directly.
   * `GameProvider.tsx` runs a throttled **4 FPS synchronization loop** that extracts state diffs/deltas and pushes immutable updates to `useUIStore` (Zustand).

3. **Lazy Derived State & Local Draft Pattern (`GovScreen.tsx`)**
   * Interactive sliders and controls use local draft state (`useState<T | null>(null)`) combined with null-coalescing derived variables (`const activeValue = draft ?? engineValue`).
   * When a user saves changes (e.g., applying tax/budget laws), the payload is dispatched to `session.updateTaxPolicy(...)` and the local draft is reset to `null`, instantly relinquishing control back to the Engine's source of truth.

---

## 3. Completed Features & Subsystems

### Core Simulation Systems
* **Macroeconomy & Treasury:** Multi-resource tax collection, ECS gold synchronization, and budget priority distribution across Economy, Military, Religion, and Administration.
* **Government Directives:** Toggleable state laws (`territorial_expansion`, `gold_focus`, `war_mode`, `aggressive_diplomacy`, etc.) with mutual-incompatibility rules.
* **World Events Feed:** Real-time logging of global simulation activity, AI diplomacy, and world events linked reactively to the `worldFeed` Zustand selector.

### UX & Android Native Layer
* **Immersive Android Layout:** Optimized layout integration without startup side effects or C++ build locking.
* **Native Build Hygiene:** Clean CMake/NDK build pipelines for `expo-modules-core`, `react-native-reanimated`, `shopify_react-native-skia`, and `react-native-gesture-handler`.

---

## 4. Master Roadmap (Upcoming Epics)

```mermaid
gantt
    title Epochs Idle — Master Roadmap
    dateFormat  YYYY-MM-DD
    section Completed
    Core ECS Engine & Economy         :done,    e1, 2026-06-01, 2026-07-28
    GovScreen Refactor & Lazy Drafts   :done,    e2, 2026-07-15, 2026-07-28
    section Next Epics
    Epic 1: Google Auth & Onboarding  :active,  e3, 2026-07-29, 2026-08-10
    Epic 2: Hexagonal SVG Map 2D      :         e4, 2026-08-11, 2026-08-25
    Epic 3: Council AI (Supreme Idle) :         e5, 2026-08-26, 2026-09-10
    Epic 4: Cloud LLM Living World    :         e6, 2026-09-11, 2026-09-30
```

### Epic 1: Professional Onboarding & Authentication
* **Google Sign-In:** Integration of Google OAuth for secure cloud saves and player identification.
* **Character Creation:** 9 cultural lineages with offline avatar fallback (DiceBear) and a Point-Buy attribute distribution system.
* **Main Menu:** Premium "New Game" and "Load Game" flows with save slot management.

### Epic 2: Interactive 2D Vector Map (Hex Grid SVG)
* **Visual Map:** Replace text-based region lists with a hexagonal SVG map using `react-native-svg`.
* **Dynamic Fog of War:** Visual differentiation between player territory (#D4AF37 gold), allied nations, neutral zones, and active war fronts.
* **Touch & Inspection:** Pinch-to-zoom gestures and interactive bottom-sheet inspection for region economics and military garrisons.

### Epic 3: Supreme Idle Mode & Autonomous Governance
* **Council Automation:** AI advisors automate infrastructure construction, recruitment, and diplomacy based on player-selected government directives.
* **Passive Progression:** Full offline/idle simulation catch-up on session launch.

### Epic 4: Living World via Cloud LLM (Gemini API)
* **Dynamic Dialogue:** Real-time generation of realistic diplomatic threats, alliances, and historical chronicles based on ECS simulation events.
* **Robust Fallback:** 100% offline rule-based fallback if cloud API requests time out or fail.

---

## 5. Developer Guide & Commands

### Prerequisites
* **Node.js:** v20+ / v24+
* **Android Studio:** Ladybug / Koala (with Android SDK 34/35 & NDK installed)
* **Java:** JDK 17+

### Local Setup & Compilation

```powershell
# 1. Navigate to mobile workspace
cd mobile

# 2. Clean install dependencies
npm ci

# 3. Stop background Gradle daemons (Prevents Windows NDK file locking)
.\android\gradlew.bat --stop

# 4. Compile native Android APK & Launch on emulator
npx expo run:android
```

### Windows NDK Troubleshooting
If Android Studio or Gradle reports `The process cannot access the file because it is being used by another process` on `.so` files:
1. Run `.\android\gradlew.bat --stop` in PowerShell.
2. Remove stale C++ build folders if needed:
   ```powershell
   Get-ChildItem -Path "android" -Include "build",".cxx" -Recurse -Force | Remove-Item -Recurse -Force
   ```
3. Re-run `npx expo run:android` or hit Play in Android Studio.
