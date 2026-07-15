import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { geminiService } from '../../application/ai/gemini-service';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useGameState } from '../GameProvider';

export default function SettingsScreen() {
  const { session } = useGameState();
  const [apiKey, setApiKey] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleDevModePress = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 2000) {
      tapCountRef.current += 1;
      if (tapCountRef.current >= 5) {
        if (session) {
          session.devModeActive = !session.devModeActive;
          session.emitState(true);
          Alert.alert(
            'Modo Desenvolvedor',
            session.devModeActive ? 'Modo Desenvolvedor ATIVADO' : 'Modo Desenvolvedor DESATIVADO'
          );
        }
        tapCountRef.current = 0;
      }
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;
  };

  const { logout, user } = useAuth();
  const { locale, changeLocale, t } = useLanguage();

  const handleLogout = () => {
    Alert.alert(t('settings.alertLogoutTitle'), t('settings.alertLogoutMessage'), [
      { text: t('mainMenu.cancel'), style: 'cancel' },
      { text: t('mainMenu.signOut'), style: 'destructive', onPress: logout },
    ]);
  };

  // Carrega configurações salvas ao focar na tela
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadSettings = async () => {
        const savedKey = await geminiService.getApiKey();
        const enabled = await geminiService.isAiEnabled();
        if (active) {
          setApiKey(savedKey || '');
          setAiEnabled(enabled);
          setTestResult(null);
        }
      };
      loadSettings();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert(t('settings.alertAttention'), t('settings.alertValidKey'));
      return;
    }
    setIsSaving(true);
    try {
      await geminiService.setApiKey(apiKey.trim());
      Alert.alert(t('settings.alertSavedTitle'), t('settings.alertSavedMessage'));
      setTestResult(null);
    } catch (err) {
      Alert.alert(t('auth.error'), t('settings.alertSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert(t('settings.alertAttention'), t('settings.alertTestKeyFirst'));
      return;
    }
    // Salva antes de testar para garantir que a chave atual seja usada
    await geminiService.setApiKey(apiKey.trim());
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await geminiService.testConnection();
      setTestResult(result);
    } catch {
      setTestResult({ ok: false, message: t('settings.testUnexpectedError') });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleAi = async (value: boolean) => {
    setAiEnabled(value);
    await geminiService.setAiEnabled(value);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚙️</Text>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <TouchableOpacity onPress={handleDevModePress} activeOpacity={0.8}>
            <Text style={{ color: '#D4AF37', fontSize: 18, fontWeight: 'bold', marginVertical: 4 }}>
              Epochs Idle
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>{t('settings.headerSubtitle')}</Text>
        </View>

        {/* ── Seção: IA Gemini ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🤖</Text>
            <Text style={styles.sectionTitle}>{t('settings.geminiTitle')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('settings.geminiDescription')}
            <Text style={styles.link}>{t('settings.linkText')}</Text>.
          </Text>

          {/* Toggle IA */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{t('settings.enableAi')}</Text>
              <Text style={styles.toggleDesc}>
                {t('settings.toggleDesc')}
              </Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={handleToggleAi}
              trackColor={{ false: '#333333', true: '#D4AF37' }}
              thumbColor={aiEnabled ? '#FFFFFF' : '#888888'}
            />
          </View>

          {/* Input da API Key */}
          <Text style={styles.inputLabel}>{t('settings.apiKeyLabel')}</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy..."
            placeholderTextColor="#555555"
            secureTextEntry={false}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
          />
          <Text style={styles.inputHint}>
            {t('settings.apiKeyHint')}
          </Text>

          {/* Botões */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveKey}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#121212" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('settings.saveKey')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.buttonDisabled]}
              onPress={handleTestConnection}
              disabled={isTesting}
              activeOpacity={0.8}
            >
              {isTesting ? (
                <ActivityIndicator color="#D4AF37" size="small" />
              ) : (
                <Text style={styles.testButtonText}>{t('settings.testConnection')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Resultado do teste */}
          {testResult && (
            <View
              style={[
                styles.testResultCard,
                testResult.ok ? styles.testResultSuccess : styles.testResultError,
              ]}
            >
              <Text style={styles.testResultText}>{testResult.message}</Text>
            </View>
          )}
        </View>

        {/* ── Seção: Sobre o Modo IA ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📖</Text>
            <Text style={styles.sectionTitle}>{t('settings.howItWorks')}</Text>
          </View>
          <View style={styles.featureCard}>
            {[
              {
                icon: '🏰',
                title: t('settings.featureDiplomatic'),
                desc: t('settings.featureDiplomaticDesc'),
              },
              {
                icon: '📜',
                title: t('settings.featureNarratives'),
                desc: t('settings.featureNarrativesDesc'),
              },
              {
                icon: '👑',
                title: t('settings.featureThoughts'),
                desc: t('settings.featureThoughtsDesc'),
              },
              {
                icon: '🔴',
                title: t('settings.featureFallback'),
                desc: t('settings.featureFallbackDesc'),
              },
            ].map((item) => (
              <View key={item.title} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Seção: Idioma ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🌐</Text>
            <Text style={styles.sectionTitle}>{t('settings.languageTitle')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('settings.languageDescription')}
          </Text>
          <View style={styles.languageButtonRow}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                locale === 'pt-BR' && styles.languageButtonActive,
              ]}
              onPress={() => changeLocale('pt-BR')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  locale === 'pt-BR' && styles.languageButtonTextActive,
                ]}
              >
                Português (PT-BR)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageButton,
                locale === 'en-US' && styles.languageButtonActive,
              ]}
              onPress={() => changeLocale('en-US')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  locale === 'en-US' && styles.languageButtonTextActive,
                ]}
              >
                English (EN-US)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Seção: Conta ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>{t('settings.accountSection')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('settings.loggedInAs')}<Text style={{ color: '#D4AF37' }}>{user?.displayName || t('settings.guest')}</Text>
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>{t('settings.signOutBtn')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Seção: Informações do Jogo ──────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>ℹ️</Text>
            <Text style={styles.sectionTitle}>{t('settings.aboutSection')}</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.aboutVersion')}</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.aboutEngine')}</Text>
              <Text style={styles.infoValue}>React Native + Expo</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.aboutIa')}</Text>
              <Text style={styles.infoValue}>Google Gemini 2.0 Flash</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.aboutOffline')}</Text>
              <Text style={[styles.infoValue, { color: '#50E3C2' }]}>{t('settings.offlineAvailable')}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {t('settings.footer')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 12,
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 20,
    marginBottom: 20,
  },
  link: {
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  toggleLabel: {
    color: '#E0E0E0',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleDesc: {
    color: '#777777',
    fontSize: 11,
    marginTop: 2,
  },
  inputLabel: {
    color: '#A0A0A0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#222222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    color: '#E0E0E0',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 8,
  },
  inputHint: {
    color: '#555555',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#D4AF37',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  testButtonText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  testResultCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: '#0D2B1D',
    borderColor: '#50E3C2',
  },
  testResultError: {
    backgroundColor: '#2B0D0D',
    borderColor: '#E24A4A',
  },
  testResultText: {
    color: '#E0E0E0',
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#3A1515',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  logoutButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureCard: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  featureTitle: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  infoLabel: {
    color: '#888888',
    fontSize: 14,
  },
  infoValue: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#333333',
    fontSize: 11,
    marginTop: 10,
  },
  languageButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#222222',
    borderColor: '#3A3A3A',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#2A2515',
  },
  languageButtonText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  languageButtonTextActive: {
    color: '#D4AF37',
  },
});
