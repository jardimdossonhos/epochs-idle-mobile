# Analysis — Requirements for R1: User Profile Switch

## Executive Summary
This analysis defines the plan to implement requirement **R1 (User Profile Switch)** in the React Native / Expo mobile application. The user profile banner will be converted into a clickable button that triggers a confirmation dialog prompting the user to "Trocar de Conta" (Switch Account), invoking `logout()` from the authentication context, which automatically redirects the user to `AuthScreen.tsx`.

---

## 1. Current Implementation Analysis

### 1.1. User Profile Banner in `MainMenuScreen.tsx`
- **Location**: `mobile/src/ui/screens/MainMenuScreen.tsx` (lines 17–36).
- **Structure**: Rendered as a non-clickable `<View style={styles.profileBanner}>` wrapper. It contains:
  - **Avatar**: Displays `user?.photoUrl` via an `<Image>` or a default crown emoji (`👑`) inside `<View style={styles.avatarContainer}>`.
  - **Profile Information**: Displays the user's name (`user?.displayName || 'Sovereign'`), email (`user?.email || 'Guest Player'`), and provider badge (`user?.provider` capitalized inside a badge container) in `<View style={styles.profileInfo}>`.
  - **Direct Logout Button**: A nested `<TouchableOpacity style={styles.logoutButton} onPress={logout}>` showing a door emoji (`🚪`).

### 1.2. Authentication Context (`AuthContext.tsx`)
- **Location**: `mobile/src/ui/context/AuthContext.tsx`.
- **Current Behavior**:
  - The context provides the `logout` function, which currently is defined as:
    ```typescript
    const logout = async () => {
      await saveUser(null);
    };
    ```
  - It clears the user's state and removes authentication credentials from `AsyncStorage`.
  - However, it **does not** call provider-specific `signOut()` methods (e.g., `GoogleAuthService.signOut()`), which means the native Google SDK remains logged in. This prevents the user from selecting a different account on subsequent Google logins.

### 1.3. App-Level Navigation & State Routing (`App.tsx`)
- **Location**: `mobile/App.tsx` (lines 155–188).
- **Behavior**:
  - The `AppContent` component monitors `authStatus` from the `useAuth()` hook.
  - If `authStatus === 'unauthenticated'`, the app state is set to `'auth'`, rendering `AuthScreen`.
  - Because `logout()` resets the authentication state to `'unauthenticated'`, calling `logout()` in `MainMenuScreen.tsx` automatically routes the user to `AuthScreen.tsx` without needing separate routing/navigation props.

---

## 2. Proposed Implementation Plan

To implement R1 correctly without introducing nested touchable issues or breaking existing functionality, we propose the following changes:

### Step 2.1: Upgrade Profile Banner to a Clickable Container
Modify `mobile/src/ui/screens/MainMenuScreen.tsx` to wrap the profile banner in a `TouchableOpacity`. To avoid nesting two interactive elements, we will remove the inner door emoji logout button (`styles.logoutButton`) since the entire banner will now be clickable and trigger the logout/switch workflow. Alternatively, the door icon can be kept as a visual indicator without its own press handler.

#### Code Draft (`mobile/src/ui/screens/MainMenuScreen.tsx`):
1. **Import `Alert`** from `react-native`.
2. **Implement `handleProfilePress`**:
   ```typescript
   const handleProfilePress = () => {
     Alert.alert(
       'Trocar de Conta',
       'Deseja realmente sair da conta atual para entrar com outro usuário?',
       [
         { text: 'Cancelar', style: 'cancel' },
         { 
           text: 'Trocar de Conta', 
           style: 'destructive', 
           onPress: async () => {
             await logout();
           } 
         }
       ]
     );
   };
   ```
3. **Update UI markup**:
   ```tsx
   {/* User Profile Banner */}
   <TouchableOpacity 
     style={styles.profileBanner} 
     onPress={handleProfilePress}
     activeOpacity={0.7}
   >
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
     {/* Visual indicator (replacing nested TouchableOpacity with a styled View containing the icon) */}
     <View style={styles.logoutButton}>
       <Text style={styles.logoutText}>🔄</Text>
     </View>
   </TouchableOpacity>
   ```

### Step 2.2: Implement Service-Level Sign-Out in `AuthContext.tsx`
Ensure that the `logout` function in `AuthContext.tsx` invokes the proper authentication service `signOut` implementation before clearing local storage.

#### Code Draft (`mobile/src/ui/context/AuthContext.tsx`):
```typescript
  const logout = async () => {
    try {
      if (user?.provider === 'google') {
        const service = new GoogleAuthService();
        await service.signOut();
      } else if (user?.provider === 'mock') {
        const service = new MockAuthService();
        await service.signOut();
      }
    } catch (error) {
      console.error('[AuthContext] Error signing out from provider service', error);
    } finally {
      await saveUser(null);
    }
  };
```

---

## 3. Verification Plan

1. **Static Analysis**:
   - Run `npx tsc --noEmit` from the `mobile` directory to ensure the changes compile without type errors.
2. **Behavioral Testing**:
   - Run the mobile app in an emulator or device.
   - Authenticate with a Google account, Mock account, or Guest.
   - On `MainMenuScreen`, verify that tapping the entire User Profile Banner displays a Native Dialog containing options: "Cancelar" (Cancel) and "Trocar de Conta" (Switch Account).
   - Tapping "Cancelar" closes the dialog and keeps the user on the MainMenuScreen.
   - Tapping "Trocar de Conta" logs out the user, performs the backend provider logout (so the next Google Sign-in requires selecting an account), and successfully navigates back to `AuthScreen.tsx`.
