import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useGameState } from '../GameProvider';
import { DiplomaticRelation } from '../../core/models/enums';

export type DiplomaticActionType = "alliance" | "non_aggression" | "peace" | "tribute" | "embargo" | "war" | "demand_vassalage";

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

  if (!gameState || !playerKingdomId) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Estado do mundo não carregado.</Text>
      </View>
    );
  }

  const player = gameState.kingdoms[playerKingdomId];
  if (!player) return null;

  // Filtrar reinos conhecidos (ex: com alguma relação)
  const knownRelations = player.diplomacy?.relations 
    ? Object.entries(player.diplomacy.relations) 
    : [];
  
  const formattedRelations = knownRelations
    .filter(([_, rel]) => rel && rel.status)
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
      console.warn("Diplomacy Action Failed:", result.message);
    }
  };

  return (
    <View style={styles.container}>
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
            return (
              <View key={id} style={[styles.card, isSelected && styles.cardSelected]}>
                <TouchableOpacity 
                  style={styles.cardHeader} 
                  onPress={() => setSelectedKingdom(isSelected ? null : id)}
                >
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                  </View>
                  <View style={styles.cardTitleArea}>
                    <Text style={styles.charName}>{name}</Text>
                    <Text style={[styles.charStatus, { color: getStatusColor(rel.status) }]}>
                      {RELATION_LABELS[rel.status]}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{isSelected ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.detailsPanel}>
                    <Text style={styles.sectionTitle}>Métricas Relacionais</Text>
                    <View style={styles.statsRow}>
                      <StatBox label="Confiança" value={(rel.score.trust * 100).toFixed(0)} color="#50E3C2" />
                      <StatBox label="Medo" value={(rel.score.fear * 100).toFixed(0)} color="#F8E71C" />
                      <StatBox label="Rivalidade" value={(rel.score.rivalry * 100).toFixed(0)} color="#E24A4A" />
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
                        label="Enviar Tributo" 
                        onPress={() => handleAction(id, "tribute")} 
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
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
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
});
