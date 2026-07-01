import { IAuthService } from './auth-service';
import { AuthUser } from './auth-types';

export class MockAuthService implements IAuthService {
  private currentUser: AuthUser | null = null;

  async signIn(): Promise<AuthUser> {
    this.currentUser = {
      id: 'mock_user_123',
      email: 'lord.dev@epochs.idle',
      displayName: 'Dev Lord Alistair',
      photoUrl: undefined,
      provider: 'mock',
    };
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.currentUser;
  }
}
