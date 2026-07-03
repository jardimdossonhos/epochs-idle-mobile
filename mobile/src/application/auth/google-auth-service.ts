import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { IAuthService } from './auth-service';
import { AuthUser } from './auth-types';

export class GoogleAuthService implements IAuthService {
  constructor() {
    GoogleSignin.configure({
      // Substitua pelo seu Web Client ID do Google Cloud Console
      // https://console.cloud.google.com/apis/credentials
      webClientId: '241974429701-3sg2p9lc0ig28mq8r1bll7sm2ui6vpvn.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }

  async signIn(): Promise<AuthUser> {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const user = userInfo.data?.user;

      if (!user) {
        throw new Error('Google sign-in failed: no user data returned');
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.name || user.email,
        photoUrl: user.photo || undefined,
        provider: 'google',
      };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Login cancelado pelo usuário.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Login já em andamento. Aguarde.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services não disponível neste dispositivo.');
      } else if (error.code === (statusCodes as any).ONE_TAP_START_FAILED) {
        throw new Error('Falha ao iniciar o login. Tente novamente.');
      }
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.warn('[GoogleAuthService] signOut error:', error);
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      if (!userInfo) return null;
      // The SDK v14+ returns the user object directly; v13 wraps it
      const user: any = (userInfo as any).user ?? userInfo;
      return {
        id: user.id ?? user.uid ?? 'google_user',
        email: user.email ?? '',
        displayName: user.name ?? user.displayName ?? user.email ?? 'Google User',
        photoUrl: user.photo ?? user.photoURL ?? undefined,
        provider: 'google',
      };
    } catch {
      return null;
    }
  }
}
