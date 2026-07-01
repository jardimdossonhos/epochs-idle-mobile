import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export interface RulerStats {
  ADM: number;
  MAR: number;
  DIP: number;
  INT: number;
  LRN: number;
}

interface StatPointBuyStepProps {
  stats: RulerStats;
  onUpdateStats: (stats: RulerStats) => void;
}

const TOTAL_BUDGET = 15;
const BASE_STAT = 3;

const STAT_INFO: Record<keyof RulerStats, { label: string; name: string; icon: string; desc: string; color: string }> = {
  ADM: { label: 'ADM', name: 'Administration', icon: '📜', desc: 'Increases tax revenue, admin capacity, and building efficiency.', color: '#4A90E2' },
  MAR: { label: 'MAR', name: 'Martial', icon: '⚔️', desc: 'Boosts army morale, manpower recovery, and war resolution.', color: '#E24A4A' },
  DIP: { label: 'DIP', name: 'Diplomacy', icon: '🕊️', desc: 'Improves diplomatic relations, trust gain, and treaty negotiations.', color: '#50E3C2' },
  INT: { label: 'INT', name: 'Intrigue', icon: '🔮', desc: 'Enhances secret plots, counter-espionage, and assassin resilience.', color: '#9013FE' },
  LRN: { label: 'LRN', name: 'Learning', icon: '📚', desc: 'Accelerates technology research and religious authority.', color: '#F8E71C' },
};

export default function StatPointBuyStep({ stats, onUpdateStats }: StatPointBuyStepProps) {
  const allocatedPoints = (stats.ADM - BASE_STAT) + (stats.MAR - BASE_STAT) + (stats.DIP - BASE_STAT) + (stats.INT - BASE_STAT) + (stats.LRN - BASE_STAT);
  const remainingPoints = TOTAL_BUDGET - allocatedPoints;

  const handleIncrement = (statKey: keyof RulerStats) => {
    if (remainingPoints <= 0 || stats[statKey] >= 10) return;
    onUpdateStats({
      ...stats,
      [statKey]: stats[statKey] + 1,
    });
  };

  const handleDecrement = (statKey: keyof RulerStats) => {
    if (stats[statKey] <= BASE_STAT) return;
    onUpdateStats({
      ...stats,
      [statKey]: stats[statKey] - 1,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.stepTitle}>Royal Attributes</Text>
      <Text style={styles.stepSubtitle}>
        Allocate points to define your ruler's talents. All attributes start at baseline 3.
      </Text>

      <View style={styles.budgetBanner}>
        <Text style={styles.budgetText}>
          Remaining Points: <Text style={styles.budgetCount}>{remainingPoints}</Text> / {TOTAL_BUDGET}
        </Text>
      </View>

      <View style={styles.statList}>
        {(Object.keys(STAT_INFO) as (keyof RulerStats)[]).map((statKey) => {
          const info = STAT_INFO[statKey];
          const val = stats[statKey];
          const canAdd = remainingPoints > 0 && val < 10;
          const canSubtract = val > BASE_STAT;

          return (
            <View key={statKey} style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>{info.icon}</Text>
                <View style={styles.statTitleBox}>
                  <Text style={styles.statName}>{info.name} ({info.label})</Text>
                  <Text style={styles.statDesc}>{info.desc}</Text>
                </View>
              </View>

              <View style={styles.controlRow}>
                <TouchableOpacity
                  style={[styles.btn, !canSubtract && styles.btnDisabled]}
                  disabled={!canSubtract}
                  onPress={() => handleDecrement(statKey)}
                >
                  <Text style={styles.btnText}>-</Text>
                </TouchableOpacity>

                <View style={styles.valBox}>
                  <Text style={[styles.valText, { color: info.color }]}>{val}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.btn, !canAdd && styles.btnDisabled]}
                  disabled={!canAdd}
                  onPress={() => handleIncrement(statKey)}
                >
                  <Text style={styles.btnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 6,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  budgetBanner: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  budgetText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
  },
  budgetCount: {
    color: '#D4AF37',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statList: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2C2C2C',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  statIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  statTitleBox: {
    flex: 1,
  },
  statName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  statDesc: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    width: 36,
    height: 36,
    backgroundColor: '#2A2A2A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    borderColor: '#444',
    backgroundColor: '#181818',
    opacity: 0.5,
  },
  btnText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
  },
  valBox: {
    width: 40,
    alignItems: 'center',
  },
  valText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
