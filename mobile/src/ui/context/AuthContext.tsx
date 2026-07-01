import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, AuthStatus } from '../../application/auth/auth-types';
import { MockAuthService } from '../../application/auth/mock-auth-service';
import { GoogleAuthService } from '../../application/auth/google-auth-service';

const AUTH_STORAGE_KEY = 'epochs_idle_auth_user';

interface AuthContextData {
  user: AuthUser | null;
  authStatus: AuthStatus;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithMock: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  authStatus: 'unauthenticated',
  isLoading: true,
  loginWithGoogle: async () => {},
  loginWithMock: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unauthenticated');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadSavedUser = async () => {
      try {
        const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (saved && isMounted) {
          const parsedUser = JSON.parse(saved) as AuthUser;
          setUser(parsedUser);
          if (parsedUser.provider === 'google') setAuthStatus('authenticated_google');
          else if (parsedUser.provider === 'mock') setAuthStatus('authenticated_mock');
          else setAuthStatus('authenticated_guest');
        }
      } catch (e) {
        console.error('[AuthContext] Failed to load auth user from storage', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadSavedUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveUser = async (u: AuthUser | null) => {
    setUser(u);
    if (!u) {
      setAuthStatus('unauthenticated');
      try {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (e) {}
      return;
    }

    if (u.provider === 'google') setAuthStatus('authenticated_google');
    else if (u.provider === 'mock') setAuthStatus('authenticated_mock');
    else setAuthStatus('authenticated_guest');

    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    } catch (e) {
      console.error('[AuthContext] Failed to save auth user to storage', e);
    }
  };

  const loginWithGoogle = async () => {
    const service = new GoogleAuthService();
    const u = await service.signIn();
    await saveUser(u);
  };

  const loginWithMock = async () => {
    const service = new MockAuthService();
    const u = await service.signIn();
    await saveUser(u);
  };

  const loginAsGuest = async () => {
    const guestUser: AuthUser = {
      id: `guest_${Date.now()}`,
      email: 'guest@epochs.idle',
      displayName: 'Wandering Sovereign',
      provider: 'guest',
    };
    await saveUser(guestUser);
  };

  const logout = async () => {
    await saveUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authStatus,
        isLoading,
        loginWithGoogle,
        loginWithMock,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
