import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';

export default function TopHUD() {
  const insets = useSafeAreaInsets();
  const { gameState, session, playerKingdomId } = useGameState();

  if (!gameState || !session) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Forjando o Mundo...</Text>
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
      <View style={styles.row}>
        <Text style={styles.eraText}>Ano {Math.floor(gameState.meta.tick / 12) + 1} (Mês {gameState.meta.tick % 12 + 1})</Text>
        
        <TouchableOpacity style={styles.pauseBtn} onPress={handleTogglePause}>
          <Text style={styles.pauseBtnText}>{isPaused ? '▶️ PLAY' : '⏸️ PAUSE'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statIcon}>🗺️</Text>
          <Text style={styles.statValue}>{regions} Domínios</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#D4AF37',
    paddingBottom: 10,
    paddingHorizontal: 15,
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
  }
});
