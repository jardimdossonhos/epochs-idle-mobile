# Epochs Idle — Technical Architecture & Development Roadmap

This document serves as the comprehensive technical specification and sitemap for **Epochs Idle**—a grand strategy simulation game powered by a TypeScript Entity-Component-System (ECS) and React Native (Expo).

---

## 1. Core Technical Principles

### 1.1 Strict Decoupling of Engine and UI
- **The Simulation Engine (`mobile/src/core/`)**: Completely agnostic of React, Expo, or UI frameworks. Operates strictly on deterministic ticks, TypedArrays, and bitmask filters.
- **The UI Layer (`mobile/src/ui/`)**: React Native visual components that observe state via an immutable **Zustand store (`useUIStore`)**.
- **The Bridge (`GameSession` + `GameProvider`)**: Intercepts ECS ticks at 4 FPS, calculates deltas, converts ECS bitmask entities to Object-Oriented payloads (`TaxPolicy`, `BudgetPriority`, etc.), and pushes updates to Zustand.

---

## 2. Architectural Patterns in Active Use

### 2.1 Lazy Derived State Pattern (UI Form/Slider Controls)
When editing continuous parameters (e.g., Tax Sliders in `GovScreen.tsx`):
- **Problem Avoided:** Direct mutation of `session` or immediate calls to `useUIStore.setState` cause React re-render loops (`Maximum update depth exceeded`) and slider rubber-banding.
- **Solution Implementation:**
  ```tsx
  // 1. Local draft state initialized to null
  const [draftTaxPolicy, setDraftTaxPolicy] = useState<TaxPolicy | null>(null);

  // 2. Null-coalescing derived state for rendering
  const activeTaxPolicy = draftTaxPolicy ?? {
    baseRate: engineTaxRate,
    taxUpperClass: engineTaxUpper,
    // ...
  };

  // 3. On apply: Dispatch to Engine and reset draft to null
  const handleApplyLaws = () => {
    session.updateTaxPolicy(draftTaxPolicy);
    setDraftTaxPolicy(null); // Instantly returns truth to the Engine
  };
  ```

### 2.2 ECS Macroeconomy & Treasury Synchronization
- Gold, Food, and Wood are stored as integer/floating-point values inside ECS component pools (`EconomySystem.ts`).
- `GameSession` extracts these pools and synchronizes them into `state.meta.playerGold`, which is then published to `useUIStore`.
- This dual-layer approach allows high-frequency tick calculations (1000s of regions/entities) without flooding React's rendering queue.

---

## 3. Directory Guide

- `mobile/src/core/ecs/`: Bitmask filters, typed component arrays, entity pools, and object recycling.
- `mobile/src/core/simulation/`: Game systems executed sequentially during `tick()` (Economy, Military, Diplomacy, Automation, Events).
- `mobile/src/ui/GameProvider.tsx`: Context provider that hosts `GameSession` and manages the 4 FPS synchronization interval.
- `mobile/src/ui/screens/GovScreen.tsx`: Government management interface implementing Lazy Derived State and reactive World Event Feeds.
- `mobile/App.tsx`: Application root and tab navigator, clean of side-effectful native navbar manipulations.

---

## 4. Complete Milestone Roadmap

| Milestone | Epic | Feature Description | Target State |
| :--- | :--- | :--- | :--- |
| **M1** | Core Engine & Government | ECS Simulation, Fiscal Laws, Event Feed, Android Build | **COMPLETED** |
| **M2** | Onboarding & Google Auth | Google Sign-In, 9 Cultures (DiceBear), Point-Buy Attributes | Planned |
| **M3** | Hexagonal SVG Map 2D | Interactive SVG hex grid, Fog of War, bottom-sheet inspector | Planned |
| **M4** | Supreme Idle & AI Council | Autonomous advisors for construction/diplomacy when idle | Planned |
| **M5** | Living World (Gemini LLM) | Dynamic AI diplomatic dialogues and world events with offline fallback | Planned |
