import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  onAuthenticated?: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { loginWithGoogle, loginWithMock, loginAsGuest } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'mock' | 'guest' | null>(null);

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    try {
      await loginWithGoogle();
      if (onAuthenticated) onAuthenticated();
    } catch (error: any) {
      const message = error?.message || 'Erro desconhecido ao fazer login com Google.';
      Alert.alert('Falha no Login', message, [{ text: 'OK' }]);
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
      Alert.alert('Erro', error?.message || 'Falha no login de desenvolvimento.');
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
      Alert.alert('Erro', error?.message || 'Falha ao entrar como visitante.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const isAnyLoading = loadingProvider !== null;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.crownIcon}>👑</Text>
        <Text style={styles.title}>EPOCHS IDLE</Text>
        <Text style={styles.subtitle}>Sovereigns of History</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enter the Realms</Text>
        <Text style={styles.cardDescription}>
          Identify yourself, Sovereign, to forge your dynasty across eras.
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
            <Text style={styles.googleButtonIcon}>🌐</Text>
          )}
          <Text style={styles.googleButtonText}>
            {loadingProvider === 'google' ? 'Conectando...' : 'Sign in with Google'}
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
          ) : (
            <Text style={styles.buttonIcon}>⚔️</Text>
          )}
          <Text style={styles.mockButtonText}>
            {loadingProvider === 'mock' ? 'Entrando...' : 'Dev / Mock Login'}
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
          ) : (
            <Text style={styles.buttonIcon}>📜</Text>
          )}
          <Text style={styles.guestButtonText}>
            {loadingProvider === 'guest' ? 'Entrando...' : 'Continue as Guest'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Version 1.0.0 • Offline Capable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  crownIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    width: 120,
    height: 2,
    backgroundColor: '#D4AF37',
    marginTop: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderColor: '#2C2C2C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
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
    fontSize: 18,
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
