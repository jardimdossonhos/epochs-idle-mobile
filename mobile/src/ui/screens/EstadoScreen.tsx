/**
 * EstadoScreen — Aba 🏛️ Estado (O Coração do Império)
 *
 * Consolida CharacterScreen + GovScreen em uma única tela
 * com navegação por Top Pills (sub-abas deslizantes):
 *   1. Corte    — Líder, Herdeiros, Ministros
 *   2. Economia — Recursos, Impostos, Orçamento
 *   3. Idle     — Diretrizes de Automação
 *   4. Religião & Leis (aparece depois de techs)
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
import { useUIStore } from '../store/game-store';

// Re-use the existing screens as content components
import CharacterScreen from './CharacterScreen';
import GovScreen from './GovScreen';

// ─── Top Pills ─────────────────────────────────────────────────────────────
type PillKey = 'court' | 'events' | 'economy' | 'idle' | 'laws';

interface Pill {
  key: PillKey;
  label: string;
  icon: string;
  evolvedLabel?: string;
}

const PILLS: Pill[] = [
  { key: 'court',   icon: '👑', label: 'Clã',        evolvedLabel: 'Corte'      },
  { key: 'events',  icon: '📰', label: 'Feed',       evolvedLabel: 'Crônicas'   },
  { key: 'economy', icon: '💰', label: 'Espólio',     evolvedLabel: 'Economia'   },
  { key: 'idle',    icon: '⚙️', label: 'Foco do Bando', evolvedLabel: 'Automação' },
  { key: 'laws',    icon: '📜', label: 'Tradição',    evolvedLabel: 'Leis & Fé'  },
];

// ─── Content Router ─────────────────────────────────────────────────────────
// We reuse existing screens — each renders only its relevant sub-tab.
// GovScreen already has internal tabs: 'economy', 'laws', 'automation', 'events'
// We just drive it to the right sub-tab from outside.
// CharacterScreen renders the Court/Characters content.

function PillContent({ pill }: { pill: PillKey }) {
  // CharacterScreen renders the full court/clan view
  if (pill === 'court') {
    return <CharacterScreen />;
  }

  // For economy, idle, laws we render GovScreen in a specific sub-tab mode.
  // GovScreen has its own tab state; we pass a defaultTab prop via a wrapper.
  if (pill === 'economy') {
    return <GovScreenShim defaultTab="economy" />;
  }

  if (pill === 'idle') {
    return <GovScreenShim defaultTab="automation" />;
  }

  if (pill === 'laws') {
    return <GovScreenShim defaultTab="laws" />;
  }

  if (pill === 'events') {
    return <GovScreenShim defaultTab="events" />;
  }

  return null;
}

/**
 * Thin wrapper around GovScreen that forces it to open on a specific internal tab.
 * GovScreen reads its own useState; this wrapper remounts it with a key
 * so it always starts on the desired tab.
 */
function GovScreenShim({ defaultTab }: { defaultTab: 'economy' | 'laws' | 'automation' | 'events' }) {
  return <GovScreen forcedTab={defaultTab} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EstadoScreen() {
  const insets = useSafeAreaInsets();
  const isEvolved  = useUIStore((s) => s.playerHasAscended);
  const hudHeight  = useUIStore((s) => s.hudHeight);
  const [activePill, setActivePill] = useState<PillKey>('court');

  return (
    <View style={[styles.container, { paddingTop: insets.top + hudHeight }]}>
      {/* ── Top Pills ──────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.pillBar}
        contentContainerStyle={styles.pillBarContent}
      >
        {PILLS.map((pill) => {
          const isActive = activePill === pill.key;
          const label = isEvolved && pill.evolvedLabel ? pill.evolvedLabel : pill.label;
          return (
            <TouchableOpacity
              key={pill.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setActivePill(pill.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.pillIcon}>{pill.icon}</Text>
              <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Dummy view to force Android ScrollView to respect right padding/margin */}
        <View style={{ width: 24 }} />
      </ScrollView>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <View style={styles.content}>
        <PillContent pill={activePill} />
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
    maxHeight: 40,
    backgroundColor: '#0D0D12',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  pillBarContent: {
    flexDirection: 'row',
    paddingLeft: 12,
    paddingRight: 32, // Extra padding to prevent right clipping on Android
    alignItems: 'center',
    paddingVertical: 2,
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
});
