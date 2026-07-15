## 2026-07-06T18:21:19Z
Implement Milestone 2: R1. Restrição do TopHUD.
Modify c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\App.tsx to hide the TopHUD component on all screens/tabs except the Map tab.
Instructions:
1. Import `useNavigationState` from `@react-navigation/native` in App.tsx (if not already imported).
2. Inside `AppContent` (App.tsx), calculate the active route name using:
```typescript
  const activeRouteName = useNavigationState(state => {
    if (!state) return null;
    let route = state.routes[state.index];
    while (route.state) {
      route = route.state.routes[route.state.index];
    }
    return route.name;
  });
```
3. Update the return statement of `AppContent` to conditionally render `<TopHUD />` only when `activeRouteName === 'Map'`.
4. Run typescript check `npx tsc --noEmit` in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile` to verify it compiles perfectly without errors.
5. Run the boot test `npx tsx test-boot.ts` in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile` to ensure the application still boots properly.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_tophud\handoff.md.
