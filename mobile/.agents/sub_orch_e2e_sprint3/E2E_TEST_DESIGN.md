# E2E Test Suite Design: Sprint 3

This document lists the 82 test cases designed for Sprint 3. The test suite is implemented in `test-sprint3-e2e.ts` and compiled/run programmatically.

## Feature Mapping
- **F1**: Region Selection (Universal)
- **F2**: Performance x30 & Play/Pause Responsiveness
- **F3**: Autosave Slot Visibility & Loading
- **F4**: DevMode Fog of War Toggle
- **F5**: Sovereign Profile Details
- **F6**: LLM Chat Panel & Conversation
- **F7**: LLM Autonomous Engine Action Triggers

---

## Tier 1: Feature Coverage (5 per feature = 35 total)

### Feature 1: Region Selection (Universal)
- **T1_F1_1_GuestLogin**: Start game with Guest login selecting "South" region; verify starting region is South.
- **T1_F1_2_GoogleLogin**: Start game with Google login selecting "North" region; verify starting region is North.
- **T1_F1_3_MockLogin**: Start game with Mock login selecting "East" region; verify starting region is East.
- **T1_F1_4_RegionAttributes**: Verify start state region contains correct initial resources/attributes for the chosen region.
- **T1_F1_5_PlayerCapitalSet**: Verify player capital is placed in the selected starting region.

### Feature 2: Performance x30 & Play/Pause Responsiveness
- **T1_F2_1_PauseHaltsTick**: Set paused to true, verify tick count does not increase when game time is advanced.
- **T1_F2_2_PlayResumesTick**: Set paused to false, verify tick count increases when game time is advanced.
- **T1_F2_3_Speed30xSet**: Set speed multiplier to x30 (frequency adjustment), verify settings are updated.
- **T1_F2_4_Speed30xExecution**: Advance time in x30 mode, verify simulation completes without crash/UI block.
- **T1_F2_5_PlayPauseToggleResponse**: Toggle play/pause multiple times, assert state changes instantly without delay.

### Feature 3: Autosave Slot Visibility & Loading
- **T1_F3_1_AutosaveTriggered**: Trigger autosave manually or via tick threshold, verify save completes.
- **T1_F3_2_AutosaveInList**: Retrieve saves list and assert that the autosave slot (`AUTOSAVE_SLOT_ID`) is present.
- **T1_F3_3_AutosavePersistent**: Simulate app reboot, reload saves list, verify autosave slot persists.
- **T1_F3_4_LoadAutosaveState**: Load from autosave slot, verify game state matches the state at the time of save.
- **T1_F3_5_AutosaveOverwrite**: Make changes in game state, trigger another autosave, verify the autosave slot is updated.

### Feature 4: DevMode Fog of War Toggle
- **T1_F4_1_DevModeToggle**: Toggle DevMode on/off, verify DevMode active status in session.
- **T1_F4_2_FowToggleOff**: Turn FOW toggle off in DevMode, assert that FOW is disabled in the game state.
- **T1_F4_3_RevealAllNPCs**: Verify all NPC kingdoms' regions become visible when FOW is disabled.
- **T1_F4_4_FowToggleOn**: Turn FOW toggle on, assert that only adjacent/explored regions remain visible.
- **T1_F4_5_DevModeFowPersistence**: Turn FOW off, perform save/load, verify FOW remains off after load if DevMode is active.

### Feature 5: Sovereign Profile Details
- **T1_F5_1_SovereignPhotoExists**: Verify every active NPC sovereign has a photo URL or asset reference.
- **T1_F5_2_SovereignCulture**: Verify NPC sovereign has a culture matching their kingdom's defined culture.
- **T1_F5_3_SovereignGender**: Verify NPC sovereign has a gender assigned (Male/Female/NonBinary).
- **T1_F5_4_SovereignStats**: Verify NPC sovereign has valid stats (military, diplomacy, admin, etc.) in range [1, 20].
- **T1_F5_5_ProfileRandomness**: Retrieve profiles of 3 NPC sovereigns and assert they are unique.

### Feature 6: LLM Chat Panel & Conversation
- **T1_F6_1_ChatHistoryStart**: Start chat with a sovereign, verify chat history is empty or has a standard greeting.
- **T1_F6_2_SendPlayerMessage**: Send chat message to sovereign, verify message appears in chat history.
- **T1_F6_3_SovereignReply**: Simulate/Receive LLM response, verify reply is added to chat history.
- **T1_F6_4_ChatLimitHistory**: Send 10 messages, verify all are preserved or truncated up to max capacity.
- **T1_F6_5_ChatPersonalityMatch**: Verify LLM prompt contains references to the sovereign's specific personality traits.

### Feature 7: LLM Autonomous Engine Action Triggers
- **T1_F7_1_TriggerDeclareWar**: Simulate LLM response triggering `declareWar`, verify kingdoms enter state of war.
- **T1_F7_2_TriggerProposePeace**: Simulate LLM response triggering `proposePeace`, verify kingdoms enter peace state.
- **T1_F7_3_TriggerCooperation**: Simulate LLM response triggering `makeCooperationAgreement`, verify treaty created.
- **T1_F7_4_InvalidActionHandling**: Send invalid action trigger from LLM, verify engine handles it gracefully without crash.
- **T1_F7_5_ActionPreconditions**: Attempt `declareWar` action when already at war, verify engine behaves consistently.

---

## Tier 2: Boundary & Corner Cases (5 per feature = 35 total)

### Feature 1: Region Selection (Universal)
- **T2_F1_1_BoundaryRegionSelect**: Choose a region at the extreme map boundary (e.g., edge index), verify correct map initialization.
- **T2_F1_2_InvalidRegionInput**: Provide an invalid region ID during character creation, verify fallback to default region.
- **T2_F1_3_RapidRegionSelect**: Rapidly change region selection in character creation before submitting, verify final choice is selected.
- **T2_F1_4_RegionLockout**: Verify player cannot select a region already completely occupied by another major kingdom.
- **T2_F1_5_NoCapitalOverlaps**: Verify starting region placement doesn't overlap with existing NPC capitals.

### Feature 2: Performance x30 & Play/Pause Responsiveness
- **T2_F2_1_StressTicking30x**: Advance 1000 ticks in x30 mode, verify tick pipeline time statistics remain bounded.
- **T2_F2_2_ToggleRateLimit**: Rapidly play/pause 50 times in 1 second, verify engine doesn't lock up or drop toggles.
- **T2_F2_3_SpeedTransitions**: Instantly switch speed between x1, x5, and x30 during simulation, verify stability.
- **T2_F2_4_PauseDuringHeavyLoad**: Pause the engine while simulating a massive battle or tick calculations, verify instant halt.
- **T2_F2_5_ResumeDuringHeavyLoad**: Resume the engine under heavy calculations, verify instant resumption.

### Feature 3: Autosave Slot Visibility & Loading
- **T3_F3_1_AutosaveCorrupted**: Save corrupted file to autosave slot, verify load gracefully fails with error instead of crashing.
- **T3_F3_2_AutosaveInterrupt**: Simulate app termination mid-autosave, verify original autosave is not corrupted.
- **T3_F3_3_AutosaveMaxCap**: Fill up storage with multiple manual saves, verify autosave still functions correctly.
- **T3_F3_4_LoadOldVersionAutosave**: Attempt to load an autosave from an older game version, verify migration/rejection.
- **T3_F3_5_AutosaveTickCoincidence**: Autosave triggers exactly when a major tick event fires, verify correct synchronization.

### Feature 4: DevMode Fog of War Toggle
- **T2_F4_1_ToggleFowMidTick**: Toggle Fog of War off mid-tick processing, verify map rendering state remains valid.
- **T2_F4_2_DevModeCommandInjections**: Inject custom command (revealing specific cells) while DevMode FOW is off, verify state updates correctly.
- **T2_F4_3_FowTogglePerformance**: Measure time to toggle FOW on/off for a 10,000-cell map, verify it's sub-100ms.
- **T2_F4_4_DevModeStateLeak**: Turn DevMode off, verify player cannot toggle FOW or access dev-only state maps.
- **T2_F4_5_MapStateSyncFow**: Check that individual region fog values in game state are correctly updated when FOW is toggled.

### Feature 5: Sovereign Profile Details
- **T2_F5_1_ExtremeStatsSovereign**: Create sovereign with max/min possible attributes (e.g. 20/0), verify profile rendering stability.
- **T2_F5_2_EmptyCultureName**: Handle sovereign with empty or undefined culture string, verify fallback rendering.
- **T2_F5_3_SovereignDeathProfile**: When a sovereign dies, verify profile changes to display the new ruler and deceased historical details.
- **T2_F5_4_SovereignTraitsConflict**: Verify sovereign cannot have conflicting traits (e.g. Pacifist and Warmonger).
- **T2_F5_5_PhotoAssetLoadFailure**: Simulate missing image/photo asset for a sovereign, verify fallback default avatar is used.

### Feature 6: LLM Chat Panel & Conversation
- **T2_F6_1_EmptyChatMessage**: Send empty string to chat, verify it is rejected or handled without empty bubble.
- **T2_F6_2_GiantChatMessage**: Send 10KB message to chat, verify system handles it without buffer overflow.
- **T2_F6_3_SpecialCharactersChat**: Send emojis and special characters in chat, verify message rendering is correct.
- **T2_F6_4_ChatConcurrency**: Rapidly send messages before sovereign responds, verify message order is preserved.
- **T2_F6_5_LLMTimeoutChat**: Simulate LLM service timeout, verify chat panel displays retry/error state.

### Feature 7: LLM Autonomous Engine Action Triggers
- **T2_F7_1_TriggerActionInvalidJSON**: Simulate LLM response with malformed JSON action block, verify engine parses it safely.
- **T2_F7_2_TriggerActionUnknownCommand**: Simulate LLM response with command `conquerWorld`, verify system rejects it safely.
- **T2_F7_3_TriggerActionSelfTarget**: Simulate LLM response where NPC declares war on themselves, verify system blocks it.
- **T2_F7_4_TriggerActionDeadSovereign**: Simulate action trigger from a sovereign who has just died, verify it is blocked.
- **T2_F7_5_MultipleTriggersSameTurn**: Simulate LLM response triggering both `declareWar` and `proposePeace` in one turn, verify correct conflict resolution.

---

## Tier 3: Cross-Feature Combinations (7 total)

- **T3_1_SelectRegionFowDevMode**: Select "West" region, toggle FOW off in DevMode, verify West is fully visible along with all other borders.
- **T3_2_Performance30xAutosave**: Run game at x30 speed, let autosave trigger periodically, verify no lag spike or performance degradation.
- **T3_3_LLMActionDuringPause**: Pause the game, trigger a `declareWar` via LLM chat, verify state transitions to war immediately but simulation stays paused.
- **T3_4_LoadAutosaveProfileCheck**: Load an autosave slot, open a sovereign's profile, verify photo, culture, and stats match pre-save details.
- **T3_5_DevModeRevealSovereignDetails**: Enable DevMode, select sovereign, verify extra dev-only stats are visible in profile.
- **T3_6_LLMActionTriggersAutosave**: Trigger `proposePeace` via LLM chat, verify that an autosave is generated to record the new treaty.
- **T3_7_Performance30xChatActive**: Open chat panel and send messages while simulation runs at x30, verify chat interface stays responsive.

---

## Tier 4: Real-world Application Scenarios (5 total)

- **T4_1_FullGameStartupToSave**: Guest login → select North region → pause/play/speed controls testing → make diplomatic chat → trigger manual save and autosave → verify both exist.
- **T4_2_DiplomaticCrisisWarNPeace**: Start game → chat with hostile sovereign → simulate hostile LLM response that triggers `declareWar` → run simulation at x30 to let war progress → chat again to pay tribute and simulate LLM triggering `proposePeace` → verify peace restored.
- **T4_3_DevModeInspectionTour**: Start game → enable DevMode → toggle FOW off to reveal map → scan 3 NPC sovereign profiles to verify demographics → toggle FOW back on → verify map hidden.
- **T4_4_AutosaveRecoveryScenario**: Start game → play 5 years at x30 → let autosave trigger → simulate app crash (destroy session) → rebuild session and load autosave → verify year, resources, and treaties are fully recovered.
- **T4_5_MultiKingdomAllianceSovereigns**: Start game → chat with 2 different NPC sovereigns → trigger cooperation agreement with both via LLM chat → verify multilateral treaties in game state → run simulation at x30 to verify diplomatic stability.
