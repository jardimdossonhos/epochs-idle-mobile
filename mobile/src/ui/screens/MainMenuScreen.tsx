import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoadGameModal from '../components/LoadGameModal';
import { useGameState } from '../GameProvider';
import DevModeModal from '../components/DevModeModal';

interface MainMenuScreenProps {
  onNewGame: () => void;
  onGameLoaded: () => void;
}

export default function MainMenuScreen({ onNewGame, onGameLoaded }: MainMenuScreenProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { session } = useGameState();
  const [isLoadModalVisible, setIsLoadModalVisible] = useState(false);
  const [isDevPanelVisible, setIsDevPanelVisible] = useState(false);

  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleTitlePress = () => {
    const now = Date.now();
    if (now - lastTapTime < 1000) {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= 5) {
        if (session) {
          session.devModeActive = !session.devModeActive;
          session.emitState();
          setIsDevPanelVisible(session.devModeActive);
        }
        setTapCount(0);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  const handleProfilePress = () => {
    Alert.alert(
      t('mainMenu.alertTitle'),
      t('mainMenu.alertMessage'),
      [
        { text: t('mainMenu.cancel'), style: 'cancel' },
        { text: t('mainMenu.signOut'), style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* User Profile Banner wrapped in TouchableOpacity */}
      <TouchableOpacity 
        style={styles.profileBanner} 
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.userPhoto} />
          ) : (
            <Text style={styles.avatarEmoji}>👑</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.displayName || t('mainMenu.sovereign')}</Text>
          <Text style={styles.userEmail}>{user?.email || t('mainMenu.guestPlayer')}</Text>
          <View style={styles.providerBadge}>
            <Text style={styles.providerText}>{(user?.provider || 'guest').toUpperCase()}</Text>
          </View>
        </View>
        {/* Changed from TouchableOpacity to View to prevent target collision */}
        <View style={styles.logoutButton}>
          <Text style={styles.logoutText}>🚪</Text>
        </View>
      </TouchableOpacity>

      {/* Title Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.8}>
          <Text style={styles.title}>{t('mainMenu.title')}</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>{t('mainMenu.subtitle')}</Text>
        <View style={styles.divider} />
      </View>

      {/* Main Actions */}
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={onNewGame}>
          <Text style={styles.buttonIcon}>⚔️</Text>
          <Text style={styles.primaryButtonText}>{t('mainMenu.newGame')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsLoadModalVisible(true)}>
          <Text style={styles.buttonIcon}>📜</Text>
          <Text style={styles.secondaryButtonText}>{t('mainMenu.loadGame')}</Text>
        </TouchableOpacity>
      </View>

      {/* Load Game Modal */}
      <LoadGameModal
        visible={isLoadModalVisible}
        onClose={() => setIsLoadModalVisible(false)}
        onLoadSuccess={() => {
          setIsLoadModalVisible(false);
          onGameLoaded();
        }}
      />

      {/* Dev Mode Modal */}
      <DevModeModal
        visible={isDevPanelVisible}
        onClose={() => setIsDevPanelVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'space-between',
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderColor: '#2C2C2C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  userPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  userEmail: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  providerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#AAA',
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    width: 140,
    height: 2,
    backgroundColor: '#D4AF37',
    marginTop: 16,
  },
  menuContainer: {
    width: '100%',
    marginBottom: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    paddingVertical: 18,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
});
