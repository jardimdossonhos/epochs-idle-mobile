import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useGameState } from '../GameProvider';
import { DiplomaticRelation } from '../../core/models/enums';
import AvatarRenderer from '../components/AvatarRenderer';
import { SOVEREIGN_TRAITS } from '../../core/models/character';
import { HudAwareScreen } from '../components/HudAwareScreen';

export type DiplomaticActionType = "alliance" | "non_aggression" | "peace" | "offer_tribute" | "demand_tribute" | "break_tribute" | "embargo" | "war" | "demand_vassalage";

const RELATION_LABELS: Record<DiplomaticRelation, string> = {
  [DiplomaticRelation.Hostile]: "Hostil",
  [DiplomaticRelation.Neutral]: "Neutro",
  [DiplomaticRelation.Friendly]: "Amistoso",
  [DiplomaticRelation.Allied]: "Aliado",
  [DiplomaticRelation.Truce]: "Trégua",
  [DiplomaticRelation.Vassal]: "Vassalo",
  [DiplomaticRelation.Overlord]: "Suserano",
};

export default function DiplomacyScreen() {
  const { gameState, session, playerKingdomId } = useGameState();
  const [selectedKingdom, setSelectedKingdom] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  if (!gameState || !playerKingdomId) {
    return (
      <HudAwareScreen>
        <Text style={styles.emptyText}>Estado do mundo não carregado.</Text>
      </HudAwareScreen>
    );
  }

  const player = gameState.kingdoms[playerKingdomId];
  if (!player) return null;

  // Filtrar reinos conhecidos (ex: com alguma relação)
  const knownRelations = player.diplomacy?.relations 
    ? Object.entries(player.diplomacy.relations) 
    : [];
  
  const formattedRelations = knownRelations
    .filter(([id, rel]) => rel && rel.status && id !== playerKingdomId)
    .map(([id, rel]) => ({
      id,
      name: gameState.kingdoms[id]?.name || "Nação Desconhecida",
      rel
    }))
    .sort((a, b) => (b.rel.score?.tradeValue || 0) - (a.rel.score?.tradeValue || 0));

  const handleAction = (targetId: string, action: DiplomaticActionType) => {
    if (!session) return;
    const result = (session as any).executeDiplomaticAction(targetId, action);
    if (result && !result.ok) {
      Alert.alert("Ação Recusada", result.message);
    } else if (result && result.ok) {
      Alert.alert("Sucesso", "Tratado enviado com sucesso.");
    }
  };

  const handleSelectKingdom = (id: string) => {
    setSelectedKingdom(selectedKingdom === id ? null : id);
    setChatInput('');
    setChatLoading(false);
    setChatError(null);
  };

  const handleSendChatMessage = async (targetId: string, customMessage?: string) => {
    const msgToSend = customMessage !== undefined ? customMessage : chatInput;
    if (!session || !msgToSend.trim()) return;
    setChatLoading(true);
    setChatError(null);
    try {
      await session.sendPlayerChatMessage(targetId, msgToSend.trim());
      setChatInput('');
    } catch (err: any) {
      setChatError(err?.message || "Falha na conexão com o Gemini.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <HudAwareScreen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diplomacia Mundial</Text>
        <Text style={styles.headerSub}>
          Ameaça de Coalizão: {((player.diplomacy?.coalitionThreat || 0) * 100).toFixed(0)}%
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {formattedRelations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma nação conhecida além das suas fronteiras ainda.</Text>
          </View>
        ) : (
          formattedRelations.map(({ id, name, rel }) => {
            const isSelected = selectedKingdom === id;
            const targetKingdom = gameState.kingdoms[id];
            const ruler = targetKingdom?.rulerId ? gameState.world.characters?.[targetKingdom.rulerId] : null;
            const fallbackCulture = id === 'k_npc_1' ? 'desert' : id === 'k_npc_2' ? 'savanna' : id === 'k_npc_3' ? 'vedic' : id === 'k_npc_4' ? 'eastern' : 'latin';
            const activeTreaties = player.diplomacy?.treaties?.filter(t => t.parties && t.parties.includes(id)) || [];

            return (
              <View key={id} style={[styles.card, isSelected && styles.cardSelected]}>
                <TouchableOpacity 
                  style={styles.cardHeader} 
                  onPress={() => handleSelectKingdom(id)}
                >
                  <AvatarRenderer 
                    cultureId={ruler?.cultureId || fallbackCulture} 
                    seed={ruler?.portraitSeed || `${id}_ruler`} 
                    gender={ruler?.gender || "male"} 
                    size={48} 
                  />
                  <View style={styles.cardTitleArea}>
                    <Text style={styles.charName}>{name}</Text>
                    <Text style={[styles.charStatus, { color: getStatusColor(rel.status) }]}>
                      {RELATION_LABELS[rel.status]}
                    </Text>
                    {activeTreaties.length > 0 && (
                      <View style={styles.treatiesBadgeRow}>
                        {activeTreaties.map((t, idx) => (
                          <View key={idx} style={styles.treatyBadge}>
                            <Text style={styles.treatyBadgeText}>
                              {t.type === "alliance" ? "🛡️ Aliança" :
                               t.type === "non_aggression" ? "🤝 Não Agressão" :
                               t.type === "tribute" ? "💰 Tributário" :
                               t.type === "peace" ? "🕊️ Trégua" : "📜 Tratado"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={styles.expandIcon}>{isSelected ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.detailsPanel}>
                    {ruler && (
                      <View style={styles.rulerProfile}>
                        <View style={styles.rulerHeader}>
                          <AvatarRenderer 
                            cultureId={ruler.cultureId} 
                            seed={ruler.portraitSeed} 
                            gender={ruler.gender} 
                            size={48} 
                          />
                          <View style={styles.rulerTitleArea}>
                            <Text style={styles.rulerNameText}>{ruler.name}</Text>
                            <Text style={styles.rulerTitleText}>{ruler.title || 'Soberano'}</Text>
                          </View>
                        </View>

                        <View style={styles.rulerTraitsArea}>
                          <Text style={styles.subsectionTitle}>Traços do Soberano</Text>
                          <Text style={styles.rulerTraitsText}>
                            {ruler.traits && ruler.traits.length > 0
                              ? ruler.traits
                                  .map(tId => SOVEREIGN_TRAITS.find(t => t.id === tId)?.name || tId)
                                  .join(', ')
                              : 'Nenhum traço notável'}
                          </Text>
                        </View>

                        <View style={styles.rulerStatsArea}>
                          <Text style={styles.subsectionTitle}>Atributos do Soberano</Text>
                          <View style={styles.rulerStatsGrid}>
                            <View style={styles.rulerStatItem}>
                              <Text style={styles.rulerStatLabel}>Admin: <Text style={styles.rulerStatValue}>{ruler.stats?.administration ?? 0}</Text></Text>
                            </View>
                            <View style={styles.rulerStatItem}>
                              <Text style={styles.rulerStatLabel}>Marcial: <Text style={styles.rulerStatValue}>{ruler.stats?.martial ?? 0}</Text></Text>
                            </View>
                            <View style={styles.rulerStatItem}>
                              <Text style={styles.rulerStatLabel}>Diplo: <Text style={styles.rulerStatValue}>{ruler.stats?.diplomacy ?? 0}</Text></Text>
                            </View>
                            <View style={styles.rulerStatItem}>
                              <Text style={styles.rulerStatLabel}>Intriga: <Text style={styles.rulerStatValue}>{ruler.stats?.intrigue ?? 0}</Text></Text>
                            </View>
                            <View style={styles.rulerStatItem}>
                              <Text style={styles.rulerStatLabel}>Estudo: <Text style={styles.rulerStatValue}>{ruler.stats?.learning ?? 0}</Text></Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    <Text style={styles.sectionTitle}>Métricas Relacionais</Text>
                    <View style={styles.statsRow}>
                      <StatBox label="Confiança" value={(rel.score.trust * 100).toFixed(0)} color="#50E3C2" />
                      <StatBox label="Medo" value={(rel.score.fear * 100).toFixed(0)} color="#F8E71C" />
                      <StatBox label="Rivalidade" value={(rel.score.rivalry * 100).toFixed(0)} color="#E24A4A" />
                      <StatBox label="Agravo" value={((rel.grievance || 0) * 100).toFixed(0)} color="#FF3B30" />
                      <StatBox label="Tensão Relig." value={(rel.score.religiousTension * 100).toFixed(0)} color="#9013FE" />
                    </View>

                    <Text style={styles.sectionTitle}>Ações Avançadas</Text>
                    <View style={styles.actionGrid}>
                      <ActionBtn 
                        label="Pacto Defensivo" 
                        onPress={() => handleAction(id, "alliance")} 
                        disabled={rel.status === DiplomaticRelation.Hostile}
                      />
                      <ActionBtn 
                        label="Pacto Ñ Agressão" 
                        onPress={() => handleAction(id, "non_aggression")} 
                        disabled={rel.status === DiplomaticRelation.Hostile}
                      />
                      <ActionBtn 
                        label="Oferecer Tributo" 
                        onPress={() => handleAction(id, "offer_tribute")} 
                      />
                      <ActionBtn 
                        label="Exigir Tributo" 
                        onPress={() => handleAction(id, "demand_tribute")} 
                      />
                      <ActionBtn 
                        label="Romper Tributo" 
                        onPress={() => handleAction(id, "break_tribute")} 
                        danger
                      />
                      <ActionBtn 
                        label="Embargo" 
                        onPress={() => handleAction(id, "embargo")} 
                      />
                      {rel.status === DiplomaticRelation.Hostile ? (
                        <ActionBtn 
                          label="Propor Paz" 
                          onPress={() => handleAction(id, "peace")} 
                          danger
                        />
                      ) : (
                        <ActionBtn 
                          label="Declarar Guerra" 
                          onPress={() => handleAction(id, "war")} 
                          danger
                        />
                      )}
                    </View>

                    {/* Chat Panel */}
                    <View style={styles.chatPanel}>
                      <Text style={styles.sectionTitle}>Mensagens com o Soberano</Text>
                      <ScrollView 
                        style={styles.chatScroll} 
                        nestedScrollEnabled={true} 
                        contentContainerStyle={styles.chatScrollContent}
                      >
                        {(!rel.chatHistory || rel.chatHistory.length === 0) ? (
                          <Text style={styles.noChatText}>Inicie uma conversa diplomática com o governante.</Text>
                        ) : (
                          rel.chatHistory.map((msg: any, idx: number) => {
                            const isPlayer = msg.sender === 'player';
                            return (
                              <View 
                                key={idx} 
                                style={[
                                  styles.chatBubble, 
                                  isPlayer ? styles.chatBubblePlayer : styles.chatBubbleNpc
                                ]}
                              >
                                <Text style={styles.chatSenderText}>{isPlayer ? 'Você' : (ruler?.name || 'Soberano')}</Text>
                                <Text style={styles.chatMessageText}>{msg.text}</Text>
                              </View>
                            );
                          })
                        )}
                      </ScrollView>

                      {chatError && (
                        <View style={styles.errorArea}>
                          <Text style={styles.errorText}>Erro: {chatError}</Text>
                          <TouchableOpacity 
                            style={styles.retryBtn} 
                            onPress={() => handleSendChatMessage(id, chatInput)}
                          >
                            <Text style={styles.retryBtnText}>Tentar Novamente</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.chatInputRow}>
                        <TextInput
                          style={styles.chatInput}
                          value={chatInput}
                          onChangeText={setChatInput}
                          placeholder="Digite uma mensagem..."
                          placeholderTextColor="#666"
                          editable={!chatLoading}
                        />
                        <TouchableOpacity 
                          style={[styles.chatSendBtn, (!chatInput.trim() || chatLoading) && styles.chatSendBtnDisabled]}
                          onPress={() => handleSendChatMessage(id)}
                          disabled={!chatInput.trim() || chatLoading}
                        >
                          {chatLoading ? (
                            <ActivityIndicator size="small" color="#121212" />
                          ) : (
                            <Text style={styles.chatSendBtnText}>Enviar</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </HudAwareScreen>
  );
}

function getStatusColor(status: DiplomaticRelation) {
  switch (status) {
    case DiplomaticRelation.Allied: return '#50E3C2';
    case DiplomaticRelation.Hostile: return '#E24A4A';
    case DiplomaticRelation.Truce: return '#F8E71C';
    case DiplomaticRelation.Vassal: return '#4A90E2';
    case DiplomaticRelation.Overlord: return '#9013FE';
    default: return '#888';
  }
}

function StatBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, onPress, disabled, danger }: { label: string, onPress: () => void, disabled?: boolean, danger?: boolean }) {
  return (
    <TouchableOpacity 
      style={[
        styles.actionBtn, 
        disabled && styles.actionBtnDisabled,
        danger && !disabled && { borderColor: '#8B0000' }
      ]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[
        styles.actionBtnText, 
        disabled && { color: '#666' },
        danger && !disabled && { color: '#E24A4A' }
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  headerTitle: { color: '#D4AF37', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#888', fontSize: 12, marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontStyle: 'italic' },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#D4AF37',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  avatarText: { color: '#D4AF37', fontSize: 24, fontWeight: 'bold' },
  cardTitleArea: { marginLeft: 12, flex: 1 },
  charName: { color: '#E0E0E0', fontSize: 18, fontWeight: 'bold' },
  charStatus: { color: '#888', fontSize: 12, marginTop: 2, fontWeight: 'bold' },
  expandIcon: { color: '#888', fontSize: 16 },
  detailsPanel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    backgroundColor: '#161616',
  },
  sectionTitle: { color: '#A0A0A0', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  statBox: { alignItems: 'center' },
  statLabel: { color: '#666', fontSize: 10, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
  },
  rulerProfile: {
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  rulerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rulerTitleArea: {
    marginLeft: 12,
  },
  rulerNameText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rulerTitleText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rulerTraitsArea: {
    marginBottom: 10,
  },
  subsectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  rulerTraitsText: {
    color: '#DDD',
    fontSize: 13,
  },
  rulerStatsArea: {
    marginTop: 4,
  },
  rulerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  rulerStatItem: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rulerStatLabel: {
    color: '#A0A0A0',
    fontSize: 11,
  },
  rulerStatValue: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  chatPanel: {
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  chatScroll: {
    height: 150,
    backgroundColor: '#121212',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chatScrollContent: {
    paddingBottom: 8,
  },
  noChatText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  chatBubble: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    maxWidth: '85%',
  },
  chatBubblePlayer: {
    alignSelf: 'flex-end',
    backgroundColor: '#2C3E50',
    borderBottomRightRadius: 0,
  },
  chatBubbleNpc: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  chatSenderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 2,
  },
  chatMessageText: {
    color: '#FFF',
    fontSize: 12,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#121212',
    borderColor: '#2A2A2A',
    borderWidth: 1,
    borderRadius: 4,
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
  },
  chatSendBtn: {
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  chatSendBtnDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  chatSendBtnText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorArea: {
    backgroundColor: '#4A1C1C',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF9999',
    fontSize: 11,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  treatiesBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  treatyBadge: {
    backgroundColor: '#1E2A38',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  treatyBadgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
