# Handoff Report — R1: User Profile Switch Requirements

## 1. Observation
- **MainMenuScreen Banner**: Located in `mobile/src/ui/screens/MainMenuScreen.tsx` (lines 17–36):
  ```tsx
  {/* User Profile Banner */}
  <View style={styles.profileBanner}>
    <View style={styles.avatarContainer}>
      {user?.photoUrl ? (
        <Image source={{ uri: user.photoUrl }} style={styles.userPhoto} />
      ) : (
        <Text style={styles.avatarEmoji}>👑</Text>
      )}
    </View>
    <View style={styles.profileInfo}>
      <Text style={styles.userName}>{user?.displayName || 'Sovereign'}</Text>
      <Text style={styles.userEmail}>{user?.email || 'Guest Player'}</Text>
      <View style={styles.providerBadge}>
        <Text style={styles.providerText}>{(user?.provider || 'guest').toUpperCase()}</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.logoutButton} onPress={logout}>
      <Text style={styles.logoutText}>🚪</Text>
    </TouchableOpacity>
  </View>
  ```
- **Authentication Context**: Located in `mobile/src/ui/context/AuthContext.tsx` (lines 105–107):
  ```typescript
  const logout = async () => {
    await saveUser(null);
  };
  ```
- **App Navigation Route**: Located in `mobile/App.tsx` (lines 155–188):
  ```typescript
  if (authStatus === 'unauthenticated') {
    setAppState('auth');
  }
  ```
- **Service implementations**:
  - `mobile/src/application/auth/google-auth-service.ts` (lines 46–52):
    ```typescript
    async signOut(): Promise<void> {
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        console.warn('[GoogleAuthService] signOut error:', error);
      }
    }
    ```
  - `mobile/src/application/auth/mock-auth-service.ts` (lines 18–20):
    ```typescript
    async signOut(): Promise<void> {
      this.currentUser = null;
    }
    ```

---

## 2. Logic Chain
1. To make the user profile banner clickable, we must change the outer `<View style={styles.profileBanner}>` wrapper to `<TouchableOpacity style={styles.profileBanner} onPress={handleProfilePress}>`.
2. Nesting a clickable `TouchableOpacity` (the existing logout button `styles.logoutButton`) inside another clickable `TouchableOpacity` violates React Native layout conventions and can cause touch target conflicts. Therefore, we should replace the inner `TouchableOpacity` with a non-clickable indicator (e.g., `<View style={styles.logoutButton}>`).
3. Pressing the profile banner must offer the option to "Trocar de Conta" (Switch Account) and perform logout. Adding a native confirmation dialog via `Alert.alert` guarantees a standard, reliable confirmation before signing out.
4. When logging out of a specific provider, particularly Google, we must call the service-specific `signOut()` method. Without it, Google Sign-In maintains the OAuth session, causing subsequent logins to automatically reuse the previous account rather than letting the user switch accounts.
5. In `mobile/App.tsx`, `AppContent` reactively switches the screen state from `'main_menu'` to `'auth'` as soon as `authStatus` becomes `'unauthenticated'`. Consequently, simply invoking `logout()` from `AuthContext` is sufficient to navigate the user back to `AuthScreen.tsx` automatically.

---

## 3. Caveats
- No caveats identified. The solution leverages existing React Native APIs (`Alert` and `TouchableOpacity`) and matches current state navigation patterns in the codebase.

---

## 4. Conclusion
We propose:
- Modifying `mobile/src/ui/screens/MainMenuScreen.tsx` to make the profile banner clickable via `TouchableOpacity`, presenting an `Alert.alert` confirmation to switch accounts, and replacing the nested touchable logout button with a visual indicator.
- Modifying `mobile/src/ui/context/AuthContext.tsx` to instantiate the user's active provider service and call its `.signOut()` method before clearing local storage.

---

## 5. Verification Method
1. **Compilation Check**:
   Run the following command from the `mobile/` directory to ensure that typescript compiles the code changes:
   ```bash
   npx tsc --noEmit
   ```
2. **Behavioral Check**:
   - Launch the application, sign in with Google or a Mock account.
   - Tap the user profile banner on the main menu.
   - Confirm the confirmation dialog ("Trocar de Conta") appears.
   - Select "Trocar de Conta". Verify the app navigates back to `AuthScreen.tsx`.
   - Click "Sign in with Google" or "Mock Login" again. Verify that the previous session has been cleared and you are prompted for login credentials/choices.
