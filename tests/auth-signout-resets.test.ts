import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Reset states in our React hooks simulation
let stateIndex = 0;
let states: any[] = [];
let stateSetters: any[] = [];
let registeredEffects: Array<{ effect: () => any; deps?: any[] }> = [];
let effectCleanups: Array<() => void> = [];

// Trigger re-render of our simulated hook environment
function renderProvider() {
  stateIndex = 0;
  const element = AuthProvider({ children: null }) as any;
  return element.props.value;
}

// React Mock Setup
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initialValue: any) => {
      const currentIndex = stateIndex++;
      if (states[currentIndex] === undefined) {
        states[currentIndex] = typeof initialValue === 'function' ? initialValue() : initialValue;
        stateSetters[currentIndex] = (newValue: any) => {
          if (typeof newValue === 'function') {
            states[currentIndex] = newValue(states[currentIndex]);
          } else {
            states[currentIndex] = newValue;
          }
          // Re-evaluate AuthProvider values on state update
          renderProvider();
        };
      }
      return [states[currentIndex], stateSetters[currentIndex]];
    },
    useEffect: (effect: () => any, deps?: any[]) => {
      registeredEffects.push({ effect, deps });
    },
  };
});

// Import after mocking react
import { AuthProvider } from '../mobile/src/ui/context/AuthContext';
import AsyncStorageMock from './mocks/async-storage-mock';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MockAuthService } from '../mobile/src/application/auth/mock-auth-service';

// Helper to flush asynchronous microtasks
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('Authentication Signout Logic & Session State Reset', () => {
  beforeEach(() => {
    // Clear storage
    AsyncStorageMock._setStore({});
    
    // Clear state harness
    states = [];
    stateSetters = [];
    registeredEffects = [];
    effectCleanups = [];
    stateIndex = 0;
    
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Clean up any effects
    for (const cleanup of effectCleanups) {
      if (cleanup) cleanup();
    }
  });

  async function mountProvider() {
    const value = renderProvider();
    
    // Execute all registered effects (simulates React mount)
    const activeEffects = [...registeredEffects];
    registeredEffects = [];
    for (const { effect } of activeEffects) {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        effectCleanups.push(cleanup);
      }
    }
    
    // Wait for the async loadSavedUser to run and complete
    await flushPromises();
    
    // Re-evaluate context values after initial load completes
    return renderProvider();
  }

  it('resets session states and clears storage on Mock provider signout', async () => {
    let context = await mountProvider();
    
    // Start unauthenticated
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');

    // Login with Mock
    await context.loginWithMock();
    
    // Fetch updated context
    context = renderProvider();
    expect(context.user).not.toBeNull();
    expect(context.user?.provider).toBe('mock');
    expect(context.authStatus).toBe('authenticated_mock');
    
    // Verify stored user in AsyncStorage
    const stored = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).provider).toBe('mock');

    // Spy on MockAuthService.signOut
    const signOutSpy = vi.spyOn(MockAuthService.prototype, 'signOut');

    // Logout
    await context.logout();
    
    // Verify state resets
    context = renderProvider();
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');
    expect(signOutSpy).toHaveBeenCalledOnce();

    // Verify AsyncStorage is cleared
    const storedAfter = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(storedAfter).toBeNull();
  });

  it('resets session states and clears storage on Google provider signout', async () => {
    let context = await mountProvider();

    // Login with Google
    await context.loginWithGoogle();
    
    context = renderProvider();
    expect(context.user).not.toBeNull();
    expect(context.user?.provider).toBe('google');
    expect(context.authStatus).toBe('authenticated_google');
    
    const stored = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).provider).toBe('google');

    // Spy on GoogleSignin.signOut
    const googleSignOutSpy = vi.spyOn(GoogleSignin, 'signOut');

    // Logout
    await context.logout();
    
    context = renderProvider();
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');
    expect(googleSignOutSpy).toHaveBeenCalledOnce();

    const storedAfter = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(storedAfter).toBeNull();
  });

  it('resets session states and clears storage on Guest provider signout', async () => {
    let context = await mountProvider();

    // Login as Guest
    await context.loginAsGuest();
    
    context = renderProvider();
    expect(context.user).not.toBeNull();
    expect(context.user?.provider).toBe('guest');
    expect(context.authStatus).toBe('authenticated_guest');
    
    const stored = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).provider).toBe('guest');

    // Spies to ensure no other provider signout is triggered
    const mockSignOutSpy = vi.spyOn(MockAuthService.prototype, 'signOut');
    const googleSignOutSpy = vi.spyOn(GoogleSignin, 'signOut');

    // Logout
    await context.logout();
    
    context = renderProvider();
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');
    
    // Verify neither service's signOut was called
    expect(mockSignOutSpy).not.toHaveBeenCalled();
    expect(googleSignOutSpy).not.toHaveBeenCalled();

    const storedAfter = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(storedAfter).toBeNull();
  });

  it('handles Google provider signout failure gracefully without blocking session reset', async () => {
    let context = await mountProvider();

    // Login with Google
    await context.loginWithGoogle();
    context = renderProvider();

    // Mock GoogleSignin.signOut to throw error
    const googleSignOutSpy = vi.spyOn(GoogleSignin, 'signOut').mockRejectedValue(new Error('Google Service Unavailable'));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Logout should still proceed
    await context.logout();
    
    // Verify session states and storage are reset
    context = renderProvider();
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');
    expect(googleSignOutSpy).toHaveBeenCalledOnce();
    
    // Verify error was caught and logged as warning
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    const storedAfter = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(storedAfter).toBeNull();
  });

  it('handles Mock provider signout failure gracefully without blocking session reset', async () => {
    let context = await mountProvider();

    // Login with Mock
    await context.loginWithMock();
    context = renderProvider();

    // Mock MockAuthService.signOut to throw error
    const mockSignOutSpy = vi.spyOn(MockAuthService.prototype, 'signOut').mockRejectedValue(new Error('Mock DB write failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Logout should still proceed
    await context.logout();
    
    // Verify session states and storage are reset
    context = renderProvider();
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');
    expect(mockSignOutSpy).toHaveBeenCalledOnce();
    
    // Verify error was caught and logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    const storedAfter = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(storedAfter).toBeNull();
  });

  it('handles offline signout scenario properly', async () => {
    let context = await mountProvider();

    // Login with Google
    await context.loginWithGoogle();
    context = renderProvider();

    // Simulating offline status: GoogleSignin.signOut times out / rejects with network error
    const googleSignOutSpy = vi.spyOn(GoogleSignin, 'signOut').mockRejectedValue(new Error('Network request failed'));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Logout
    await context.logout();
    
    // Verify session states and storage are reset
    context = renderProvider();
    expect(context.user).toBeNull();
    expect(context.authStatus).toBe('unauthenticated');
    expect(googleSignOutSpy).toHaveBeenCalledOnce();
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    const storedAfter = await AsyncStorageMock.getItem('epochs_idle_auth_user');
    expect(storedAfter).toBeNull();
  });
});
