import { describe, it, expect, beforeEach } from 'vitest';

import { MockAuthService } from '../mobile/src/application/auth/mock-auth-service';
import { GoogleAuthService } from '../mobile/src/application/auth/google-auth-service';
import { AuthUser, AuthStatus } from '../mobile/src/application/auth/auth-types';

export class InMemoryAuthRepository {
  private currentUser: AuthUser | null = null;

  async getStoredUser(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  async setStoredUser(user: AuthUser | null): Promise<void> {
    this.currentUser = user;
  }

  async clear(): Promise<void> {
    this.currentUser = null;
  }
}

describe('Authentication Services & Repository Audit', () => {
  let authRepo: InMemoryAuthRepository;

  beforeEach(() => {
    authRepo = new InMemoryAuthRepository();
  });

  it('should authenticate correctly with MockAuthService', async () => {
    const mockService = new MockAuthService();
    expect(await mockService.getCurrentUser()).toBeNull();

    const user = await mockService.signIn();
    expect(user.id).toBe('mock_user_123');
    expect(user.provider).toBe('mock');
    expect(user.displayName).toBe('Dev Lord Alistair');

    await authRepo.setStoredUser(user);
    const saved = await authRepo.getStoredUser();
    expect(saved).toEqual(user);

    await mockService.signOut();
    expect(await mockService.getCurrentUser()).toBeNull();
  });

  it('should authenticate correctly with GoogleAuthService', async () => {
    const googleService = new GoogleAuthService();
    expect(await googleService.getCurrentUser()).toBeNull();

    const user = await googleService.signIn();
    expect(user.provider).toBe('google');
    expect(user.email).toContain('gmail.com');
    expect(user.displayName).toContain('Google');

    await authRepo.setStoredUser(user);
    const saved = await authRepo.getStoredUser();
    expect(saved?.provider).toBe('google');

    await googleService.signOut();
    expect(await googleService.getCurrentUser()).toBeNull();
  });

  it('should manage guest sessions in memory repository', async () => {
    const guestUser: AuthUser = {
      id: 'guest_test_99',
      email: 'guest@epochs.idle',
      displayName: 'Wandering Sovereign',
      provider: 'guest',
    };

    await authRepo.setStoredUser(guestUser);
    let stored = await authRepo.getStoredUser();
    expect(stored?.provider).toBe('guest');

    await authRepo.clear();
    stored = await authRepo.getStoredUser();
    expect(stored).toBeNull();
  });
});
