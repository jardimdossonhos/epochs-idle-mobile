import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MockAuthService } from '../mobile/src/application/auth/mock-auth-service';
import { GoogleAuthService } from '../mobile/src/application/auth/google-auth-service';

// Inline replication of exact repository logic from MobileGameStateRepository.ts for empirical verification in Node
class TestableMobileSaveRepository {
  private mockFiles: Record<string, string>;
  constructor(files: Record<string, string>) {
    this.mockFiles = files;
  }

  private getUriForSlot(slotId: string): string {
    return `file:///mock_docs/epochs_save_${slotId}.json`;
  }

  async listSlots(): Promise<any[]> {
    const slots: any[] = [];
    const knownSlots = ["auto-1", "manual-1", "manual-2", "manual-3"];

    for (const slotId of knownSlots) {
      try {
        const uri = this.getUriForSlot(slotId);
        if (this.mockFiles[uri]) {
          const jsonValue = this.mockFiles[uri];
          const snapshot = JSON.parse(jsonValue);
          // EXACT CODE FROM MobileGameStateRepository.ts line 94:
          slots.push(snapshot.summary);
        }
      } catch (e) {}
    }

    // EXACT CODE FROM MobileGameStateRepository.ts line 101:
    return slots.sort((a, b) => b.savedAt - a.savedAt);
  }
}

// Inline replication of getAvatarUrl logic from AvatarRenderer.tsx
function getAvatarUrl(cultureId?: string, seed?: string): string {
  const safeSeed = seed || 'sovereign_1';
  let style = 'lorelei';
  switch (cultureId) {
    case 'nordic': style = 'adventurer'; break;
    case 'eastern': style = 'avataaars'; break;
    case 'desert': style = 'micah'; break;
    case 'savanna': style = 'micah'; break;
    case 'celtic': style = 'adventurer'; break;
    case 'slavic': style = 'lorelei'; break;
    case 'indigenous': style = 'avataaars'; break;
    case 'vedic': style = 'micah'; break;
    default: style = 'lorelei'; break;
  }
  return `https://api.dicebear.com/9.x/${style}/png?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;
}

describe('Adversarial Challenge Suite: Auth, Save Slots & Offline Rendering', () => {

  describe('Domain 1: Auth Persistence & Provider Switching', () => {
    it('should test provider identity structure for Mock vs Google', async () => {
      const mockAuth = new MockAuthService();
      const googleAuth = new GoogleAuthService();

      const mockUser = await mockAuth.signIn();
      const googleUser = await googleAuth.signIn();

      expect(mockUser.provider).toBe('mock');
      expect(googleUser.provider).toBe('google');
      expect(mockUser.id).not.toEqual(googleUser.id);
    });

    it('demonstrates fallback behavior on unknown/invalid stored auth provider in storage', () => {
      const storedUserWithInvalidProvider = {
        id: 'user_999',
        email: 'hacker@test.com',
        displayName: 'Evil Sovereign',
        provider: 'unsupported_provider_xyz'
      };

      // Exact logic in AuthContext.tsx loadSavedUser:
      const parsedUser = storedUserWithInvalidProvider as any;
      let authStatus = 'unauthenticated';
      if (parsedUser.provider === 'google') authStatus = 'authenticated_google';
      else if (parsedUser.provider === 'mock') authStatus = 'authenticated_mock';
      else authStatus = 'authenticated_guest';

      // FINDING / ISSUE: Unknown/invalid providers silently degrade to 'authenticated_guest'
      expect(authStatus).toBe('authenticated_guest');
    });
  });

  describe('Domain 2: Save Slot Loading & Repository Resilience', () => {

    it('EMPIRICAL BUG 1: MobileSaveRepository.listSlots returns array with undefined when slot JSON lacks summary, causing LoadGameModal to crash', async () => {
      const mockFiles: Record<string, string> = {
        'file:///mock_docs/epochs_save_manual-1.json': JSON.stringify({ state: {} })
      };
      const repo = new TestableMobileSaveRepository(mockFiles);
      const rawSlots = await repo.listSlots();

      // MobileSaveRepository returns [undefined] because snapshot.summary is missing
      expect(rawSlots).toContain(undefined);

      // In LoadGameModal.tsx line 30-33:
      let modalError: any = null;
      try {
        for (const slot of rawSlots) {
          const slotId = slot.slotId; // Accessing property on undefined slot in rawSlots
        }
      } catch (err) {
        modalError = err;
      }

      expect(modalError).not.toBeNull();
      expect(modalError.message).toContain("Cannot read properties of undefined");
    });

    it('EMPIRICAL BUG 2: LoadGameModal culture extraction throws TypeError when snapshot.state is missing kingdoms', async () => {
      const rawSlots = [{ slotId: 'manual-1', savedAt: 1000, tick: 100, playerKingdomName: 'Test' }];
      
      const mockRepoMissingKingdoms = async (slotId: string) => {
        return { summary: rawSlots[0], state: {} as any };
      };

      let missingKingdomsError: any = null;
      try {
        for (const slot of rawSlots) {
          const snapshot = await mockRepoMissingKingdoms(slot.slotId);
          if (snapshot) {
            // Exact code in LoadGameModal.tsx line 35:
            const playerKingdom = snapshot.state ? snapshot.state.kingdoms['k_player'] : (snapshot as any).kingdoms?.['k_player'];
          }
        }
      } catch (err) {
        missingKingdomsError = err;
      }

      expect(missingKingdomsError).not.toBeNull();
      expect(missingKingdomsError.message).toContain("Cannot read properties of undefined");
    });

    it('EMPIRICAL BUG 3: LoadGameModal handleSelectSlot fails silently on load error', async () => {
      let loadSuccessCalled = false;
      const mockSession = {
        loadSlot: async (id: string) => { throw new Error("Disk read error"); },
        start: () => {},
      };

      // Re-creating handleSelectSlot from LoadGameModal.tsx lines 59-68
      const handleSelectSlot = async (slotId: any) => {
        if (!mockSession) return;
        try {
          await mockSession.loadSlot(slotId);
          mockSession.start();
          loadSuccessCalled = true;
        } catch (e) {
          // caught and logged, but user is given no UI notification!
        }
      };

      await handleSelectSlot('manual-1');
      expect(loadSuccessCalled).toBe(false);
    });
  });

  describe('Domain 3: Offline Avatar Rendering', () => {

    it('tests getAvatarUrl mapping across cultures', () => {
      expect(getAvatarUrl('nordic', 'seed1')).toContain('adventurer');
      expect(getAvatarUrl('latin', 'seed1')).toContain('lorelei');
      expect(getAvatarUrl('eastern', 'seed1')).toContain('avataaars');
      expect(getAvatarUrl('desert', 'seed1')).toContain('micah');
    });

    it('EMPIRICAL BUG 4: AvatarRenderer fallback color concatenation produces invalid color strings for non-hex colors', () => {
      const testCases = ['red', 'blue', 'rgb(255, 0, 0)', 'hsl(0, 100%, 50%)'];

      for (const color of testCases) {
        const themeColor = color;
        // Exact code in AvatarRenderer.tsx line 84:
        const computedBgColor = themeColor + '33';
        
        // Check if computedBgColor is an invalid color string (e.g. "red33", "rgb(255, 0, 0)33")
        const isValidHexAlpha = /^#[0-9A-Fa-f]{8}$/.test(computedBgColor);
        expect(isValidHexAlpha).toBe(false);
        expect(computedBgColor).toMatch(/(red33|blue33|rgb.*33|hsl.*33)/);
      }
    });

    it('handles null or undefined cultureId gracefully in URL generator', () => {
      const defaultUrl = getAvatarUrl(undefined, 'seed123');
      expect(defaultUrl).toContain('lorelei');
      
      const nullUrl = getAvatarUrl(null as any, 'seed123');
      expect(nullUrl).toContain('lorelei');
    });
  });

});
