import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';
import { useLanguage } from '../context/LanguageContext';
import DevModeModal from './DevModeModal';
import { useUIStore } from '../store/game-store';
import { mmkvStorage } from '../memory-persistence';

export default function TopHUD() {
  const insets = useSafeAreaInsets();
  const { session } = useGameState();
  const { t } = useLanguage();
  const [isDevPanelVisible, setIsDevPanelVisible] = React.useState(false);

  const targetTick = useUIStore(s => s.tick);
  const isPaused = useUIStore(s => s.isPaused);
  const gold = useUIStore(s => s.playerGold);
  const pop = useUIStore(s => s.playerPopulation);
  const regions = useUIStore(s => s.playerRegions);



  if (!session) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('topHud.forgingWorld')}</Text>
      </View>
    );
  }

  const handleTogglePause = () => {
    session.togglePause();
    useUIStore.setState({ isPaused: !useUIStore.getState().isPaused });
  };

  const handleManualSave = () => {
    try {
      const state = session.getState();
      if (!state) throw new Error("Estado da Engine nulo.");
      const slotId = 'save_manual_' + new Date().getTime();
      mmkvStorage.set(slotId, JSON.stringify(state));
      alert("Jogo Salvo com Sucesso!");
    } catch (err) {
      alert("Erro ao salvar: " + err);
    }
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
            year: Math.floor(targetTick / 12) + 1,
            month: (targetTick % 12) + 1
          })}
        </Text>
        
        <TouchableOpacity style={styles.pauseBtn} onPress={handleTogglePause}>
          <Text style={styles.pauseBtnText}>{isPaused ? t('topHud.play') : t('topHud.pause')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.pauseBtn} onPress={handleManualSave}>
          <Text style={styles.pauseBtnText}>💾 Salvar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statIcon}>🗺️</Text>
          <Text style={styles.statValue}>{regions} {t('topHud.domains')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statValue}>{Math.floor(pop).toLocaleString()}</Text>
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

