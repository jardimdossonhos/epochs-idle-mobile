import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useGameState } from '../GameProvider';

interface DevModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DevModeModal({ visible, onClose }: DevModeModalProps) {
  const { gameState, session } = useGameState();
  const [combatK1, setCombatK1] = useState('');
  const [combatK2, setCombatK2] = useState('');
  const [combatResult, setCombatResult] = useState<any>(null);

  if (!gameState || !session) return null;

  const kingdoms = Object.values(gameState.kingdoms).filter(k => k.id !== 'k_nature');
  const npcKingdoms = kingdoms.filter(k => !k.isPlayer);

  // a) Fog of War
  const handleToggleFow = () => {
    session.toggleFogOfWar();
  };

  // b) +1000 Recursos
  const handleAddResource = (resource: string) => {
    session.addResourcesDev(resource);
  };

  // c) Completar Pesquisa
  const handleCompleteResearch = () => {
    session.completeResearchDev();
  };

  // d) Desbloquear todas as Eras
  const handleUnlockAllTechs = () => {
    session.unlockAllTechnologiesDev();
  };

  // e) Decisions
  const decisions = session.getNpcAiDecisionsDev();

  // f) Assume control
  const handleAssumeControl = (kId: string) => {
    session.assumeControlOfKingdom(kId);
  };

  // g) Autoplay
  const handleToggleAutoplay = () => {
    session.toggleAutoplay();
  };

  // h) Diplomacy matrix
  const diploMatrix = session.getDiplomacyMatrix();

  // i) Combat simulator
  const handleSimulateCombat = () => {
    if (combatK1 && combatK2) {
      const res = session.simulateCombatDev(combatK1, combatK2);
      setCombatResult(res);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🛠️ PAINEL DO DESENVOLVEDOR</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
            {/* Simulation Speed & Autoplay */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Controle de Simulação</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, session.autoplayEnabled && styles.activeBtn]}
                  onPress={handleToggleAutoplay}
                >
                  <Text style={styles.btnText}>
                    {session.autoplayEnabled ? '🔴 Desativar Autoplay (100x)' : '▶️ Ativar Autoplay (NPC 100x)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Fog of War Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fog of War</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, session.fogOfWarDisabled && styles.activeBtn]}
                  onPress={handleToggleFow}
                >
                  <Text style={styles.btnText}>
                    {session.fogOfWarDisabled ? '👁️ Reativar Fog of War' : '🚫 Desativar Fog of War'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* +1000 Recursos */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adicionar +1000 Recursos</Text>
              <View style={styles.gridRow}>
                {['gold', 'wood', 'iron', 'food', 'faith', 'legitimacy', 'manpower', 'wealth'].map((res) => (
                  <TouchableOpacity
                    key={res}
                    style={styles.gridBtn}
                    onPress={() => handleAddResource(res)}
                  >
                    <Text style={styles.gridBtnText}>{res.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Technology / Research */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pesquisas & Tecnologias</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleCompleteResearch}>
                  <Text style={styles.btnText}>⚡ Completar Pesquisa Ativa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleUnlockAllTechs}>
                  <Text style={styles.btnText}>🔓 Desbloquear Todas as Eras</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Civilization Control Swap */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assumir Controle de Civilização</Text>
              <Text style={styles.helperText}>Escolha um reino NPC para controlar:</Text>
              <View style={styles.selectRow}>
                {npcKingdoms.map((k) => (
                  <TouchableOpacity
                    key={k.id}
                    style={styles.selectBtn}
                    onPress={() => handleAssumeControl(k.id)}
                  >
                    <Text style={styles.selectBtnText}>{k.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* AI Decision Viewer */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Visualizador de Decisões da IA</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.cellBold]}>Reino NPC</Text>
                  <Text style={[styles.tableCell, styles.cellBold]}>Foco</Text>
                  <Text style={[styles.tableCell, styles.cellBold]}>Alvo</Text>
                  <Text style={[styles.tableCell, styles.cellBold, { flex: 2 }]}>Razão</Text>
                </View>
                {decisions.map((d) => (
                  <View key={d.kingdomId} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{d.kingdomName}</Text>
                    <Text style={styles.tableCell}>{d.focus}</Text>
                    <Text style={styles.tableCell}>{d.target}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{d.reason}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Diplomatic Relations Matrix */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Matriz de Relacionamento</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.cellBold]}>De</Text>
                  <Text style={[styles.tableCell, styles.cellBold]}>Para</Text>
                  <Text style={[styles.tableCell, styles.cellBold]}>Status</Text>
                  <Text style={[styles.tableCell, styles.cellBold]}>Conf/Med/Riv</Text>
                </View>
                {diploMatrix.map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{item.fromName}</Text>
                    <Text style={styles.tableCell}>{item.toName}</Text>
                    <Text style={styles.tableCell}>{item.status}</Text>
                    <Text style={styles.tableCell}>{`${Math.round(item.trust * 100)}/${Math.round(item.fear * 100)}/${Math.round(item.rivalry * 100)}`}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Combat Simulator */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Simulador de Combate Rápido</Text>
              <View style={styles.selectorRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {kingdoms.map(k => (
                    <TouchableOpacity
                      key={k.id}
                      style={[styles.microBtn, combatK1 === k.id && styles.microBtnSelected]}
                      onPress={() => setCombatK1(k.id)}
                    >
                      <Text style={styles.microBtnText}>{k.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.vsText}>VS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {kingdoms.map(k => (
                    <TouchableOpacity
                      key={k.id}
                      style={[styles.microBtn, combatK2 === k.id && styles.microBtnSelected]}
                      onPress={() => setCombatK2(k.id)}
                    >
                      <Text style={styles.microBtnText}>{k.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 12 }]}
                onPress={handleSimulateCombat}
              >
                <Text style={styles.btnText}>⚔️ Simular Combate</Text>
              </TouchableOpacity>
              {combatResult && (
                <View style={styles.combatResultBox}>
                  <Text style={styles.resultWinner}>Ganhador Previsto: {combatResult.winnerName}</Text>
                  <Text style={styles.resultText}>Baixas Previstas Reino 1: {combatResult.casualties1} soldados</Text>
                  <Text style={styles.resultText}>Baixas Previstas Reino 2: {combatResult.casualties2} soldados</Text>
                  <Text style={styles.resultOutcome}>Resultado: {combatResult.predictedOutcome}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    height: '90%',
    backgroundColor: '#0D1117', // Dark background requested
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161B22',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#8B949E',
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#161B22',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
    paddingBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBtn: {
    borderColor: '#D4AF37',
    backgroundColor: '#30363D',
  },
  btnText: {
    color: '#C9D1D9',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridBtn: {
    width: '48%',
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  gridBtnText: {
    color: '#C9D1D9',
    fontSize: 11,
    fontWeight: 'bold',
  },
  helperText: {
    color: '#8B949E',
    fontSize: 11,
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectBtn: {
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectBtnText: {
    color: '#C9D1D9',
    fontSize: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
    padding: 8,
    backgroundColor: '#0D1117',
  },
  tableHeader: {
    backgroundColor: '#21262D',
  },
  tableCell: {
    flex: 1,
    color: '#C9D1D9',
    fontSize: 10,
  },
  cellBold: {
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  selectorRow: {
    gap: 6,
  },
  vsText: {
    color: '#8B949E',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
    marginVertical: 4,
  },
  microBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 6,
  },
  microBtnSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#30363D',
  },
  microBtnText: {
    color: '#C9D1D9',
    fontSize: 11,
  },
  combatResultBox: {
    marginTop: 12,
    backgroundColor: '#0D1117',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  resultWinner: {
    color: '#50E3C2',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  resultText: {
    color: '#C9D1D9',
    fontSize: 11,
    marginBottom: 2,
  },
  resultOutcome: {
    color: '#8B949E',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
