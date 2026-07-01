export type AuthProviderType = 'google' | 'mock' | 'guest';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  provider: AuthProviderType;
}

export type AuthStatus = 'unauthenticated' | 'authenticated_guest' | 'authenticated_google' | 'authenticated_mock';
