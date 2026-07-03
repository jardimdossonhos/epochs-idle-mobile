import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthScreenProps {
  onAuthenticated?: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { loginWithGoogle, loginWithMock, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'mock' | 'guest' | null>(null);

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    try {
      await loginWithGoogle();
      if (onAuthenticated) onAuthenticated();
    } catch (error: any) {
      let message = error?.message || t('auth.googleUnknownError');
      if (message.includes('DEVELOPER_ERROR')) {
        message = t('auth.googleSha1Error');
      }
      Alert.alert(t('auth.loginFailed'), message, [{ text: 'OK' }]);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMockLogin = async () => {
    setLoadingProvider('mock');
    try {
      await loginWithMock();
      if (onAuthenticated) onAuthenticated();
    } catch (error: any) {
      Alert.alert(t('auth.error'), error?.message || t('auth.mockFailed'));
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestLogin = async () => {
    setLoadingProvider('guest');
    try {
      await loginAsGuest();
      if (onAuthenticated) onAuthenticated();
    } catch (error: any) {
      Alert.alert(t('auth.error'), error?.message || t('auth.guestFailed'));
    } finally {
      setLoadingProvider(null);
    }
  };

  const isAnyLoading = loadingProvider !== null;

  return (
    <ImageBackground 
      source={require('../../../assets/splash_bg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>EPOCHS</Text>
          <Text style={styles.subtitleTitle}>IDLE</Text>
          <Text style={styles.subtitle}>{t('auth.sovereignsOfHistory')}</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('auth.enterRealms')}</Text>
          <Text style={styles.cardDescription}>
            {t('auth.identifyYourself')}
          </Text>

          {/* Google Login Button */}
          <TouchableOpacity
            style={[styles.googleButton, isAnyLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {loadingProvider === 'google' ? (
              <ActivityIndicator color="#FFFFFF" size="small" style={styles.buttonIcon} />
            ) : (
              <Text style={styles.googleButtonIcon}>G</Text>
            )}
            <Text style={styles.googleButtonText}>
              {loadingProvider === 'google' ? t('auth.connecting') : t('auth.signInWithGoogle')}
            </Text>
          </TouchableOpacity>

          {/* Mock / Dev Login Button */}
          <TouchableOpacity
            style={[styles.mockButton, isAnyLoading && styles.buttonDisabled]}
            onPress={handleMockLogin}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {loadingProvider === 'mock' ? (
              <ActivityIndicator color="#D4AF37" size="small" style={styles.buttonIcon} />
            ) : null}
            <Text style={styles.mockButtonText}>
              {loadingProvider === 'mock' ? t('auth.signingIn') : t('auth.mockLogin')}
            </Text>
          </TouchableOpacity>

          {/* Guest Login Button */}
          <TouchableOpacity
            style={[styles.guestButton, isAnyLoading && styles.buttonDisabled]}
            onPress={handleGuestLogin}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {loadingProvider === 'guest' ? (
              <ActivityIndicator color="#AAAAAA" size="small" style={styles.buttonIcon} />
            ) : null}
            <Text style={styles.guestButtonText}>
              {loadingProvider === 'guest' ? t('auth.signingIn') : t('auth.continueAsGuest')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>{t('auth.versionOffline')}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Cinematic dark overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitleTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginTop: 12,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
    marginTop: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  googleButtonIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2C',
    borderColor: '#D4AF37',
    borderWidth: 1,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  mockButtonText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: '#444444',
    borderWidth: 1,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
  },
  guestButtonText: {
    color: '#AAAAAA',
    fontSize: 15,
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerText: {
    marginTop: 40,
    color: '#555555',
    fontSize: 12,
  },
});
