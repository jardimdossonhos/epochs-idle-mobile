export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => ({
    data: {
      user: {
        id: 'google_user_123',
        email: 'user@gmail.com',
        name: 'Google Sovereign',
      }
    }
  }),
  signOut: async () => {},
  getCurrentUser: async () => null,
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  ONE_TAP_START_FAILED: 'ONE_TAP_START_FAILED',
};
