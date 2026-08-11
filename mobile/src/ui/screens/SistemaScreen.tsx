/**
 * SistemaScreen — Aba ⚙️ Sistema & Crônicas
 *
 * Consolida MenuScreen + SettingsScreen + Event Log em Top Pills:
 *   1. 📖 Crônicas — Feed de eventos históricos completo (Event Log)
 *   2. 💾 Jogo     — Salvar/Carregar, velocidade, automação global
 *   3. ⚙️ Config   — Gemini API Key, idioma, Dev Mode
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MenuScreen from './MenuScreen';
import SettingsScreen from './SettingsScreen';
import { useUIStore } from '../store/game-store';

// ─── Top Pills ─────────────────────────────────────────────────────────────
type PillKey = 'log' | 'game' | 'config';

const PILLS: { key: PillKey; icon: string; label: string }[] = [
  { key: 'log',    icon: '📖', label: 'Crônicas'    },
  { key: 'game',   icon: '💾', label: 'Jogo'        },
  { key: 'config', icon: '⚙️', label: 'Configurações' },
];

// ─── Crônicas (Event Log) ───────────────────────────────────────────────────
function CronicasTab() {
  const worldFeed = useUIStore((s) => s.worldFeed);

  const severityColor = (sev: string) => {
    if (sev === 'critical') return '#E24A4A';
    if (sev === 'danger')   return '#FF6B35';
    if (sev === 'warning')  return '#F8E71C';
    if (sev === 'success')  return '#50E3C2';
    return '#888';
  };

  const sortedFeed = worldFeed
    ? [...worldFeed].sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0))
    : [];

  return (
    <ScrollView style={styles.feedScroll} contentContainerStyle={styles.feedContent}>
      <Text style={styles.sectionTitle}>📖 O Grande Livro da Dinastia</Text>
      <Text style={styles.sectionSubtitle}>
        Todos os eventos registrados em ordem cronológica inversa.
      </Text>
      {sortedFeed.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>⏳</Text>
          <Text style={styles.emptyText}>
            As crônicas ainda estão em branco.{'\n'}O destino do seu reino ainda está sendo escrito...
          </Text>
        </View>
      ) : (
        sortedFeed.map((evt, i) => {
          const color = severityColor(evt.severity || 'info');
          return (
            <View key={evt.id || i} style={[styles.logCard, { borderLeftColor: color }]}>
              <View style={styles.logHeader}>
                <Text style={[styles.logSeverity, { color }]}>
                  ● {(evt.severity || 'info').toUpperCase()}
                </Text>
                {evt.occurredAt ? (
                  <Text style={styles.logDate}>
                    Ano {Math.floor(evt.occurredAt / 12) + 1} · M{(evt.occurredAt % 12) + 1}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.logTitle}>{evt.title}</Text>
              {evt.details ? (
                <Text style={styles.logDetails}>{evt.details}</Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SistemaScreen() {
  const insets = useSafeAreaInsets();
  const [activePill, setActivePill] = useState<PillKey>('game');
  const hudHeight = useUIStore((s) => s.hudHeight);

  return (
    <View style={[styles.container, { paddingTop: insets.top + hudHeight }]}>
      {/* ── Top Pills ───────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillBar}
        contentContainerStyle={styles.pillBarContent}
      >
        {PILLS.map((pill) => {
          const isActive = activePill === pill.key;
          return (
            <TouchableOpacity
              key={pill.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setActivePill(pill.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.pillIcon}>{pill.icon}</Text>
              <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <View style={styles.content}>
        {activePill === 'log'    && <CronicasTab />}
        {activePill === 'game'   && <MenuScreen />}
        {activePill === 'config' && <SettingsScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  pillBar: {
    maxHeight: 52,
    backgroundColor: '#0D0D12',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  pillBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C3A',
    backgroundColor: '#1A1A24',
    gap: 5,
  },
  pillActive: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  pillIcon: {
    fontSize: 13,
  },
  pillLabel: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  pillLabelActive: {
    color: '#D4AF37',
  },
  content: {
    flex: 1,
  },
  // ── Crônicas ──
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#555',
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  logCard: {
    backgroundColor: '#1A1A24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#444',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logSeverity: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logDate: {
    color: '#555',
    fontSize: 10,
  },
  logTitle: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  logDetails: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
  },
});
