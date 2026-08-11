/**
 * TopHUD — Header global flutuante sobre todos os tabs.
 *
 * Responsabilidades:
 *  - Mostra sinais vitais: Data, Play/Pause, Ouro (+renda), Estabilidade
 *  - Gerencia alertas críticos (sino 🔔 + badge)
 *  - Mede seu próprio height via onLayout e publica em useUIStore.hudHeight
 *    para que as telas abaixo apliquem o paddingTop correto.
 *
 * O que NÃO faz:
 *  - Salvar o jogo (isso fica na aba Sistema → Jogo)
 *  - Mostrar recursos secundários (Comida, Ferro, etc.)
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';
import { useLanguage } from '../context/LanguageContext';
import DevModeModal from './DevModeModal';
import { useUIStore } from '../store/game-store';

// ─── Alerts Drawer ────────────────────────────────────────────────────────────
function AlertsDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const worldFeed = useUIStore((s) => s.worldFeed);
  const { session } = useGameState();

  const alerts = React.useMemo(() => {
    if (!worldFeed?.length) return [];
    return [...worldFeed]
      .sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0))
      .filter((e) => e.requiresAction || e.severity === 'critical' || e.severity === 'danger' || e.severity === 'warning')
      .slice(0, 10);
  }, [worldFeed]);

  const severityColor = (sev: string) => {
    if (sev === 'critical') return '#E24A4A';
    if (sev === 'danger')   return '#FF6B35';
    if (sev === 'warning')  return '#F8E71C';
    return '#50E3C2';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <Pressable style={styles.drawerContainer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>🔔 Alertas & Ações Pendentes</Text>
            <TouchableOpacity onPress={onClose} style={styles.drawerClose} hitSlop={8}>
              <Text style={styles.drawerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.drawerScroll} keyboardShouldPersistTaps="handled">
            {alerts.length === 0 ? (
              <Text style={styles.noAlertsText}>
                Nenhum alerta crítico.{'\n'}Seu reino está estável. ✨
              </Text>
            ) : (
              alerts.map((evt, i) => {
                const color = severityColor(evt.severity || 'info');
                return (
                  <View key={evt.id || i} style={[styles.alertCard, { borderLeftColor: color }]}>
                    <View style={styles.alertRow}>
                      <Text style={[styles.alertSeverity, { color }]}>
                        ● {(evt.severity || 'INFO').toUpperCase()}
                      </Text>
                      {evt.occurredAt ? (
                        <Text style={styles.alertDate}>
                          Ano {Math.floor(evt.occurredAt / 12) + 1}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.alertTitle}>{evt.title}</Text>
                    {evt.details ? (
                      <Text style={styles.alertDetails}>{evt.details}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Stability Breakdown Tooltip ──────────────────────────────────────────────
function StabilityTooltip({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const playerStability  = useUIStore((s) => s.playerStability);
  const playerCorruption = useUIStore((s) => s.playerCorruption);
  const playerInflation  = useUIStore((s) => s.playerInflation);
  const playerEfficiency = useUIStore((s) => s.playerEfficiency);
  const playerLegitimacy = useUIStore((s) => s.playerLegitimacy);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <Pressable style={[styles.drawerContainer, { maxHeight: 340 }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>👑 Análise de Estabilidade</Text>
            <TouchableOpacity onPress={onClose} style={styles.drawerClose} hitSlop={8}>
              <Text style={styles.drawerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <BreakdownRow
              label="Estabilidade"
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
              label="Corrupção"
              value={`-${(playerCorruption * 100).toFixed(1)}%`}
              color={playerCorruption > 0.2 ? '#E24A4A' : '#666'}
            />
            <BreakdownRow
              label="Inflação"
              value={`-${(playerInflation * 100).toFixed(1)}%`}
              color={playerInflation > 0.15 ? '#E24A4A' : '#666'}
            />
            <Text style={styles.tooltipHint}>
              Toque em "Estado → Economia" para ajustar impostos e orçamento.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Treasury Tooltip ──────────────────────────────────────────────────────────
function TreasuryTooltip({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const gold = useUIStore((s) => s.playerGold);
  const goldIncome = useUIStore((s) => s.playerGoldIncome);
  const taxBase = useUIStore((s) => s.playerTaxBaseRate);
  const corruption = useUIStore((s) => s.playerCorruption);
  const inflation = useUIStore((s) => s.playerInflation);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <Pressable style={[styles.drawerContainer, { maxHeight: 340 }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>💰 Tesouro do Reino</Text>
            <TouchableOpacity onPress={onClose} style={styles.drawerClose} hitSlop={8}>
              <Text style={styles.drawerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <BreakdownRow
              label="Ouro Total"
              value={Math.floor(gold).toLocaleString()}
              color="#D4AF37"
            />
            <BreakdownRow
              label="Balanço Mensal"
              value={`${goldIncome >= 0 ? '+' : ''}${goldIncome.toFixed(1)}/t`}
              color={goldIncome >= 0 ? '#50E3C2' : '#E24A4A'}
            />
            <BreakdownRow
              label="Taxa de Imposto Base"
              value={`${(taxBase * 100).toFixed(0)}%`}
              color="#FFF"
            />
            <BreakdownRow
              label="Perda por Corrupção"
              value={`-${(corruption * 100).toFixed(1)}%`}
              color={corruption > 0.2 ? '#E24A4A' : '#666'}
            />
            <BreakdownRow
              label="Aumento por Inflação"
              value={`+${(inflation * 100).toFixed(1)}%`}
              color={inflation > 0.15 ? '#E24A4A' : '#666'}
            />
            <Text style={styles.tooltipHint}>
              Toque em "Estado {'>'} Economia" para ajustar impostos e orçamentos e melhorar seu balanço.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Main TopHUD ──────────────────────────────────────────────────────────────
export default function TopHUD() {
  const insets = useSafeAreaInsets();
  const { session } = useGameState();
  const { t } = useLanguage();

  const [isDevPanelVisible,  setIsDevPanelVisible]  = useState(false);
  const [alertsVisible,      setAlertsVisible]      = useState(false);
  const [stabilityVisible,   setStabilityVisible]   = useState(false);
  const [treasuryVisible,    setTreasuryVisible]    = useState(false);

  const tick           = useUIStore((s) => s.tick);
  const isPaused       = useUIStore((s) => s.isPaused);
  const gold           = useUIStore((s) => s.playerGold);
  const goldIncome     = useUIStore((s) => s.playerGoldIncome);
  const stability      = useUIStore((s) => s.playerStability);
  const worldFeed      = useUIStore((s) => s.worldFeed);

  const alertCount = worldFeed.filter(
    (e) => e.requiresAction || e.severity === 'critical'
  ).length;

  const year  = Math.floor(tick / 12) + 1;
  const goldColor = goldIncome >= 0 ? '#50E3C2' : '#E24A4A';
  const stabilityColor =
    stability >= 70 ? '#50E3C2' : stability >= 40 ? '#F8E71C' : '#E24A4A';

  // ── Publish measured height to store so screens can apply correct paddingTop
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) {
      useUIStore.setState({ hudHeight: height });
    }
  }, []);

  const handleTogglePause = () => {
    session?.togglePause();
    useUIStore.setState({ isPaused: !useUIStore.getState().isPaused });
  };

  const renderContent = () => {
    if (!session) {
      return <Text style={styles.loadingText}>{t('topHud.forgingWorld')}</Text>;
    }

    return (
      <>
        {/* Dev Mode Banner */}
        {session.devModeActive && (
          <TouchableOpacity
            style={styles.devModeBanner}
            onPress={() => setIsDevPanelVisible(true)}
          >
            <Text style={styles.devModeBannerText}>⚠️ DEV MODE ⚠️</Text>
          </TouchableOpacity>
        )}

        {/* ── Single compact row ───────────────────────────────────────── */}
        <View style={styles.singleRow}>
          
          {/* Bell Icon (discrete top-left) */}
          <TouchableOpacity style={styles.bellBtn} onPress={() => setAlertsVisible(true)}>
            <Text style={styles.bellIcon}>🔔</Text>
            {alertCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Gold chip — left (TAPPABLE) */}
          <TouchableOpacity style={styles.statChip} onPress={() => setTreasuryVisible(true)}>
            <Text style={styles.chipIcon}>🪙</Text>
            <View style={styles.chipTextBlock}>
              <Text style={styles.chipValue}>{Math.floor(gold).toLocaleString()}</Text>
              <Text style={[styles.chipIncome, { color: goldColor }]}>
                {goldIncome >= 0 ? '+' : ''}{goldIncome.toFixed(1)}/t
              </Text>
            </View>
          </TouchableOpacity>

          {/* Play/Pause — center icon only */}
          <TouchableOpacity style={styles.playBtn} onPress={handleTogglePause} hitSlop={10}>
            <Text style={styles.playIcon}>{isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>

          {/* Stability chip — tappable */}
          <TouchableOpacity style={styles.statChip} onPress={() => setStabilityVisible(true)}>
            <Text style={styles.chipIcon}>⚖️</Text>
            <View style={styles.chipTextBlock}>
              <Text style={[styles.chipValue, { color: stabilityColor }]}>
                {(stability || 100).toFixed(0)}%
              </Text>
              <Text style={styles.chipLabel}>Estab.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <>
      <View
        style={[styles.container, { paddingTop: insets.top + 4 }]}
        onLayout={handleLayout}
        pointerEvents="box-none"
      >
        {renderContent()}
      </View>

      <AlertsDrawer    visible={alertsVisible}    onClose={() => setAlertsVisible(false)} />
      <StabilityTooltip visible={stabilityVisible} onClose={() => setStabilityVisible(false)} />
      <TreasuryTooltip  visible={treasuryVisible}  onClose={() => setTreasuryVisible(false)} />
      <DevModeModal    visible={isDevPanelVisible} onClose={() => setIsDevPanelVisible(false)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 15, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.35)',
    paddingHorizontal: 10,
    paddingBottom: 4,
    zIndex: 1000,
    elevation: 10,
  },
  loadingText: {
    color: '#D4AF37',
    textAlign: 'center',
    paddingVertical: 4,
    fontStyle: 'italic',
    fontSize: 13,
  },

  // ── Single compact row
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dateText: {  // kept to avoid TS errors if referenced elsewhere
    color: '#888',
    fontSize: 10,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E2A',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  playIcon: {
    color: '#D4AF37',
    fontSize: 13,
    lineHeight: 15,
    textAlign: 'center',
  },
  bellBtn: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { fontSize: 17 },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: '#E24A4A',
    borderRadius: 6,
    minWidth: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

  // Row 2 styles removed — merged into singleRow
  chipIcon: { fontSize: 16 },
  chipTextBlock: { alignItems: 'flex-start' as const },
  chipValue: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: 'bold' as const,
    lineHeight: 14,
  },
  chipIncome: {
    fontSize: 9,
    fontWeight: '600' as const,
    lineHeight: 11,
  },
  chipLabel: {
    color: '#666',
    fontSize: 9,
    lineHeight: 11,
  },

  // Dev banner
  devModeBanner: {
    backgroundColor: '#E74C3C',
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 6,
  },
  devModeBannerText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Drawer / Modal
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-start',
    paddingTop: 90,
    paddingHorizontal: 14,
  },
  drawerContainer: {
    backgroundColor: '#14141E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    maxHeight: 480,
    overflow: 'hidden',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#202030',
  },
  drawerTitle: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  drawerClose: { padding: 4 },
  drawerCloseText: { color: '#666', fontSize: 16 },
  drawerScroll: { padding: 12 },
  noAlertsText: {
    color: '#50E3C2',
    textAlign: 'center',
    padding: 24,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  alertCard: {
    backgroundColor: '#1C1C28',
    borderRadius: 8,
    padding: 11,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  alertSeverity: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  alertDate:    { color: '#555', fontSize: 10 },
  alertTitle:   { color: '#E0E0E0', fontSize: 13, fontWeight: 'bold', marginBottom: 3 },
  alertDetails: { color: '#888', fontSize: 12, lineHeight: 16 },

  // Stability tooltip
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2A',
  },
  breakdownLabel: { color: '#888', fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: 'bold' },
  tooltipHint: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
