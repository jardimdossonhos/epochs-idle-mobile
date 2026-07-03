import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';
import { useLanguage } from '../context/LanguageContext';
import DevModeModal from './DevModeModal';

export default function TopHUD() {
  const insets = useSafeAreaInsets();
  const { gameState, session, playerKingdomId } = useGameState();
  const { t } = useLanguage();
  const [isDevPanelVisible, setIsDevPanelVisible] = React.useState(false);

  const targetTick = gameState?.meta.tick ?? 0;
  const [visualTick, setVisualTick] = React.useState(targetTick);

  React.useEffect(() => {
    if (gameState) {
      const diff = targetTick - visualTick;
      if (Math.abs(diff) > 12) {
        setVisualTick(targetTick);
      } else if (diff > 0) {
        const timer = setTimeout(() => {
          setVisualTick(prev => prev + 1);
        }, 40);
        return () => clearTimeout(timer);
      } else if (diff < 0) {
        setVisualTick(targetTick);
      }
    }
  }, [visualTick, targetTick, gameState]);

  if (!gameState || !session) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('topHud.forgingWorld')}</Text>
      </View>
    );
  }

  const myKingdom = gameState.kingdoms[playerKingdomId];
  const gold = myKingdom?.economy?.stock?.gold || 0;
  
  const metrics = session.getKingdomMetrics(playerKingdomId);
  const pop = metrics.totalPopulation;
  const regions = metrics.controlledRegions;
  const isPaused = gameState.meta.paused;

  const handleTogglePause = () => {
    session.togglePause();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {session.devModeActive && (
        <TouchableOpacity style={styles.devModeBanner} onPress={() => setIsDevPanelVisible(true)}>
          <Text style={styles.devModeBannerText}>⚠️ MODO DESENVOLVEDOR ATIVO ⚠️</Text>
        </TouchableOpacity>
      )}
      <View style={styles.row}>
        <Text style={styles.eraText}>
          {t('topHud.eraText', {
            year: Math.floor(visualTick / 12) + 1,
            month: (visualTick % 12) + 1
          })}
        </Text>
        
        <TouchableOpacity style={styles.pauseBtn} onPress={handleTogglePause}>
          <Text style={styles.pauseBtnText}>{isPaused ? t('topHud.play') : t('topHud.pause')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statIcon}>🗺️</Text>
          <Text style={styles.statValue}>{regions} {t('topHud.domains')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statValue}>{pop.toLocaleString()}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{gold.toFixed(2)}</Text>
        </View>
      </View>

      <DevModeModal visible={isDevPanelVisible} onClose={() => setIsDevPanelVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.75)', // Glassmorphism
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.5)',
    paddingBottom: 10,
    paddingHorizontal: 15,
    zIndex: 1000,
    elevation: 5,
  },
  loadingText: {
    color: '#D4AF37',
    textAlign: 'center',
    padding: 10,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  eraText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pauseBtn: {
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginLeft: 10,
  },
  pauseBtnText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  statIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  statValue: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 14,
  },
  devModeBanner: {
    backgroundColor: '#E74C3C',
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  devModeBannerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
