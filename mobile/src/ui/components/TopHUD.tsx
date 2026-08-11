import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';
import { useLanguage } from '../context/LanguageContext';
import DevModeModal from './DevModeModal';
import { useUIStore } from '../store/game-store';
import { mmkvStorage } from '../memory-persistence';

// ─── Alert Notification System ───────────────────────────────────────────────
// The bell taps into worldFeed events marked as requiring action or high severity
function useActionableAlerts() {
  const worldFeed = useUIStore((s) => s.worldFeed);
  if (!worldFeed || worldFeed.length === 0) return [];

  // Sort newest first, filter to actionable + recent critical/danger events
  return [...worldFeed]
    .sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0))
    .filter((e) => e.requiresAction || e.severity === 'critical' || e.severity === 'danger')
    .slice(0, 10);
}

function AlertsDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const alerts = useActionableAlerts();
  const { session } = useGameState();

  const severityColor = (sev: string) => {
    if (sev === 'critical') return '#E24A4A';
    if (sev === 'danger') return '#FF6B35';
    if (sev === 'warning') return '#F8E71C';
    return '#50E3C2';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <View style={styles.drawerContainer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>🔔 Alertas & Ações Pendentes</Text>
            <TouchableOpacity onPress={onClose} style={styles.drawerClose}>
              <Text style={styles.drawerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.drawerScroll}>
            {alerts.length === 0 ? (
              <Text style={styles.noAlertsText}>
                Nenhum alerta crítico. Seu reino está estável. ✨
              </Text>
            ) : (
              alerts.map((evt, i) => {
                const color = severityColor(evt.severity || 'info');
                const proposal =
                  evt.requiresAction && evt.actionPayload?.proposalId && session
                    ? (session as any)
                        .getState()
                        ?.kingdoms?.[
                          (session as any).getState()?.playerKingdomId || 'k_player'
                        ]?.diplomacy?.proposals?.find(
                          (p: any) => p.id === evt.actionPayload?.proposalId
                        )
                    : null;
                return (
                  <View key={evt.id || i} style={[styles.alertCard, { borderLeftColor: color }]}>
                    <View style={styles.alertRow}>
                      <Text style={[styles.alertSeverity, { color }]}>
                        ● {(evt.severity || 'INFO').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.alertTitle}>{evt.title}</Text>
                    <Text style={styles.alertDetails}>{evt.details}</Text>
                    {evt.requiresAction && proposal && (
                      <View style={styles.alertActions}>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => {
                            (session as any).acceptProposal(proposal.id);
                            onClose();
                          }}
                        >
                          <Text style={styles.acceptBtnText}>Aceitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => {
                            (session as any).rejectProposal(proposal.id);
                            onClose();
                          }}
                        >
                          <Text style={styles.rejectBtnText}>Recusar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Stability Breakdown Tooltip ─────────────────────────────────────────────
function StabilityTooltip({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const playerStability = useUIStore((s) => s.playerStability);
  const playerCorruption = useUIStore((s) => s.playerCorruption);
  const playerInflation = useUIStore((s) => s.playerInflation);
  const playerEfficiency = useUIStore((s) => s.playerEfficiency);
  const playerLegitimacy = useUIStore((s) => s.playerLegitimacy);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <View style={[styles.drawerContainer, { maxHeight: 340 }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>👑 Análise de Estabilidade</Text>
            <TouchableOpacity onPress={onClose} style={styles.drawerClose}>
              <Text style={styles.drawerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <BreakdownRow
              label="Estabilidade Atual"
              value={`${(playerStability || 100).toFixed(1)}%`}
              color={playerStability >= 70 ? '#50E3C2' : playerStability >= 40 ? '#F8E71C' : '#E24A4A'}
            />
            <BreakdownRow
              label="Legitimidade"
              value={Math.floor(playerLegitimacy).toLocaleString()}
              color="#D4AF37"
            />
            <BreakdownRow
              label="Eficiência Estatal"
              value={`${(playerEfficiency * 100).toFixed(1)}%`}
              color={playerEfficiency >= 0.8 ? '#50E3C2' : '#F8E71C'}
            />
            <BreakdownRow
              label="Corrupção (penalidade)"
              value={`-${(playerCorruption * 100).toFixed(1)}%`}
              color={playerCorruption > 0.2 ? '#E24A4A' : '#888'}
            />
            <BreakdownRow
              label="Inflação (penalidade)"
              value={`-${(playerInflation * 100).toFixed(1)}%`}
              color={playerInflation > 0.15 ? '#E24A4A' : '#888'}
            />
            <Text style={styles.tooltipHint}>
              Toque em qualquer recurso na aba Estado para ver o detalhamento completo de cada valor.
            </Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' }}>
      <Text style={{ color: '#AAA', fontSize: 13 }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: 'bold' }}>{value}</Text>
    </View>
  );
}

// ─── Main TopHUD ──────────────────────────────────────────────────────────────
export default function TopHUD() {
  const insets = useSafeAreaInsets();
  const { session } = useGameState();
  const { t } = useLanguage();
  const [isDevPanelVisible, setIsDevPanelVisible] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [stabilityVisible, setStabilityVisible] = useState(false);

  const tick = useUIStore((s) => s.tick);
  const isPaused = useUIStore((s) => s.isPaused);
  const gold = useUIStore((s) => s.playerGold);
  const goldIncome = useUIStore((s) => s.playerGoldIncome);
  const playerStability = useUIStore((s) => s.playerStability);
  const worldFeed = useUIStore((s) => s.worldFeed);

  // Alert badge count
  const alertCount = worldFeed.filter(
    (e) => e.requiresAction || e.severity === 'critical'
  ).length;

  const year = Math.floor(tick / 12) + 1;
  const month = (tick % 12) + 1;

  const goldColor = goldIncome >= 0 ? '#50E3C2' : '#E24A4A';
  const stabilityColor =
    playerStability >= 70 ? '#50E3C2' : playerStability >= 40 ? '#F8E71C' : '#E24A4A';

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
      if (!state) throw new Error('Estado da Engine nulo.');
      const slotId = 'save_manual_' + new Date().getTime();
      mmkvStorage.set(slotId, JSON.stringify(state));
      alert('Jogo Salvo com Sucesso!');
    } catch (err) {
      alert('Erro ao salvar: ' + err);
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
        {/* Dev Mode Banner */}
        {session.devModeActive && (
          <TouchableOpacity
            style={styles.devModeBanner}
            onPress={() => setIsDevPanelVisible(true)}
          >
            <Text style={styles.devModeBannerText}>⚠️ MODO DESENVOLVEDOR ATIVO ⚠️</Text>
          </TouchableOpacity>
        )}

        {/* Main HUD Row */}
        <View style={styles.row}>
          {/* Date */}
          <Text style={styles.dateText}>
            Ano {year} · Mês {month}
          </Text>

          {/* Center: Play/Pause + Speed */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleTogglePause}>
              <Text style={styles.controlBtnText}>{isPaused ? '▶' : '⏸'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={handleManualSave}>
              <Text style={styles.controlBtnText}>💾</Text>
            </TouchableOpacity>
          </View>

          {/* Right: Alert Bell */}
          <TouchableOpacity style={styles.bellBtn} onPress={() => setAlertsVisible(true)}>
            <Text style={styles.bellIcon}>🔔</Text>
            {alertCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Gold */}
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>💰</Text>
            <View>
              <Text style={styles.statValue}>{Math.floor(gold).toLocaleString()}</Text>
              <Text style={[styles.statIncome, { color: goldColor }]}>
                {goldIncome >= 0 ? '+' : ''}{goldIncome.toFixed(1)}/t
              </Text>
            </View>
          </View>

          {/* Stability (tappable → breakdown) */}
          <TouchableOpacity style={styles.statChip} onPress={() => setStabilityVisible(true)}>
            <Text style={styles.statIcon}>👑</Text>
            <View>
              <Text style={[styles.statValue, { color: stabilityColor }]}>
                {(playerStability || 100).toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>Estab.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawers & Modals */}
      <AlertsDrawer visible={alertsVisible} onClose={() => setAlertsVisible(false)} />
      <StabilityTooltip visible={stabilityVisible} onClose={() => setStabilityVisible(false)} />
      <DevModeModal visible={isDevPanelVisible} onClose={() => setIsDevPanelVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(13, 13, 18, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.4)',
    paddingBottom: 8,
    paddingHorizontal: 12,
    zIndex: 1000,
    elevation: 10,
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
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 90,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    backgroundColor: '#1E1E28',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  controlBtnText: {
    color: '#D4AF37',
    fontSize: 13,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E24A4A',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C3A',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statIncome: {
    fontSize: 10,
    fontWeight: '600',
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
  },
  devModeBanner: {
    backgroundColor: '#E74C3C',
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  devModeBannerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Drawer styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 12,
  },
  drawerContainer: {
    backgroundColor: '#16161E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    maxHeight: 480,
    overflow: 'hidden',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3A',
  },
  drawerTitle: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: 'bold',
  },
  drawerClose: {
    padding: 4,
  },
  drawerCloseText: {
    color: '#888',
    fontSize: 16,
  },
  drawerScroll: {
    padding: 12,
  },
  noAlertsText: {
    color: '#50E3C2',
    textAlign: 'center',
    padding: 24,
    fontStyle: 'italic',
  },
  alertCard: {
    backgroundColor: '#1E1E2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  alertRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  alertSeverity: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  alertTitle: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertDetails: {
    color: '#999',
    fontSize: 12,
    lineHeight: 16,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#50E3C2',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#2A1A1A',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E24A4A',
  },
  rejectBtnText: {
    color: '#E24A4A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tooltipHint: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
    fontStyle: 'italic',
  },
});
