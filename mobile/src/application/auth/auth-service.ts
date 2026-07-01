import { AuthUser } from './auth-types';

export interface IAuthService {
  signIn(): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
}
