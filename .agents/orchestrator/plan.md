# Development Plan: Epochs Idle v1.0 Master Roadmap

This plan details the milestone decomposition to deliver the final version 1.0 of Epochs Idle, fulfilling requirements R1 through R4 from ORIGINAL_REQUEST.md.

## Milestones Overview

### Milestone 1: Epic 1 — Commercial Onboarding & Google Login (m1_onboarding)
- **Goal**: Implement Google Sign-In authentication, full Main Menu navigation (New/Load Game), Character Creation flow with 9 cultures, Point Buy attribute system, starting territory selection, and DiceBear offline fallback for avatars.
- **Key Deliverables**: Google Sign-In service/mock, Main Menu UI with save selection, Character Creation screens (Culture, Point Buy, Territory, Avatar fallback), integrated into GameSession initiation.

### Milestone 2: Epic 2 — Interactive 2D Vector Map (m2_vector_map)
- **Goal**: Build a premium native SVG 2D interactive world map with Fog of War, clickable regions and armies, displaying real-time data driven by the underlying ECS engine (`GameSession`).
- **Key Deliverables**: SVG Map rendering component, Fog of War overlay calculation/shader/render, clickable region/army inspect panels, dynamic state bindings to GameSession ticks.

### Milestone 3: Epic 3 — Supreme Idle Mode & Government Guidelines (m3_idle_mode)
- **Goal**: Create the Government Guidelines panel and administrative AI engine that automates kingdom macro-management based on strategic directives (e.g., Gold Focus, Expansion, Peace) via autonomous construction, diplomacy, and recruitment orders.
- **Key Deliverables**: Government Guidelines UI panel, AI macro-controller connected to simulation loop, dynamic budget allocation and automated action execution engine.

### Milestone 4: Epic 4 — Cloud AI & Immersion (m4_cloud_ai)
- **Goal**: Integrate Gemini API for dynamic AI-generated event texts and hyper-realistic diplomatic dialogues for enemy leaders, backed by a robust 100% offline fallback system.
- **Key Deliverables**: Gemini API service with offline fallback/caching, dynamic event text injector connected to EventBus, dynamic AI diplomatic interaction system.

### Milestone 5: Epic 5 — E2E Integration, Performance & Verification Audit (m5_integration)
- **Goal**: Comprehensive E2E testing, React Native Android build verification, zero console errors, performance optimization (preventing UI thread blocking during 1000ms engine ticks), and full forensic integrity auditing.
- **Key Deliverables**: Passing E2E test suite, clean console logs, performance profiling verification, clean forensic audit report.
