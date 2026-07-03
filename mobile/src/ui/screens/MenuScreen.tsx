import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useGameState } from '../GameProvider';
import { AILogger } from '../../infrastructure/telemetry/AILogger';
import type { SaveSummary, SaveSlotId } from '../../core/contracts/game-ports';
import { AUTOSAVE_SLOT_ID, MANUAL_SLOT_ID, MANUAL_SLOT_2, MANUAL_SLOT_3 } from '../../infrastructure/persistence/save-slots';
import { createInitialState } from '../../application/boot/create-initial-state';
import { WORLD_DEFINITIONS_V1 } from '../../application/boot/generated/world-definitions-v1';

const SLOTS: { id: SaveSlotId; label: string; canSave: boolean }[] = [
  { id: AUTOSAVE_SLOT_ID, label: "Autosave", canSave: false },
  { id: MANUAL_SLOT_ID, label: "Slot 1", canSave: true },
  { id: MANUAL_SLOT_2, label: "Slot 2", canSave: true },
  { id: MANUAL_SLOT_3, label: "Slot 3", canSave: true },
];

export default function MenuScreen() {
  const { gameState, session, staticWorldData } = useGameState();
  const [summaries, setSummaries] = useState<SaveSummary[]>([]);

  const loadSummaries = async () => {
    if (!session) return;
    const list = await session.listSaveSlots();
    setSummaries(list.filter(Boolean));
  };

  useEffect(() => {
    loadSummaries();
  }, [session]);

  const handleSave = async (slotId: SaveSlotId) => {
    if (!session) return;
    try {
      await (session as any).saveManual(slotId);
      Alert.alert("Sucesso", "Império salvo com sucesso!");
      loadSummaries();
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar jogo.");
    }
  };

  const handleLoad = async (slotId: SaveSlotId) => {
    if (!session) return;
    try {
      await session.loadSlot(slotId);
      Alert.alert("Sucesso", "Império carregado. (Pode demorar 1s para refletir na UI)");
    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar.");
    }
  };

  const handleGodMode = () => {
    if (gameState) {
      AILogger.logStateDump(gameState);
      Alert.alert("God Mode", "Snapshot da memória enviado para a IA!");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Menu do Sistema</Text>
      
      <View style={styles.speedControlBox}>
        <Text style={styles.speedControlTitle}>Velocidade do Tempo</Text>
        <View style={styles.speedBtnsRow}>
          {[1, 5, 15, 30].map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedBtn,
                gameState?.meta.speedMultiplier === speed && styles.speedBtnActive
              ]}
              onPress={() => {
                if (session && typeof (session as any).setSpeed === 'function') {
                  (session as any).setSpeed(speed);
                }
              }}
            >
              <Text style={[
                styles.speedBtnText,
                gameState?.meta.speedMultiplier === speed && styles.speedBtnTextActive
              ]}>{speed}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Jogos Salvos</Text>
      {SLOTS.map((slot) => {
        const summary = summaries.find(s => s.slotId === slot.id);
        return (
          <View key={slot.id} style={styles.slotCard}>
            <View style={styles.slotInfo}>
              <Text style={styles.slotTitle}>{slot.label}</Text>
              {summary ? (
                <>
                  <Text style={styles.slotDetails}>{summary.playerKingdomName} - Ano {Math.floor(summary.tick / 12) + 1}</Text>
                  <Text style={styles.slotDate}>{new Date(summary.savedAt).toLocaleString()}</Text>
                </>
              ) : (
                <Text style={styles.slotEmpty}>Vazio</Text>
              )}
            </View>
            <View style={styles.slotActions}>
              {slot.canSave && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleSave(slot.id)}>
                  <Text style={styles.actionBtnText}>Salvar</Text>
                </TouchableOpacity>
              )}
              {summary && (
                <TouchableOpacity style={[styles.actionBtn, styles.loadBtn]} onPress={() => handleLoad(slot.id)}>
                  <Text style={styles.actionBtnText}>Carregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#2C1A5C', borderColor: '#8A2BE2', marginTop: 20 }]} onPress={handleGodMode}>
        <Text style={styles.menuBtnText}>👁️ Enviar Estado para IA (God Mode)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuBtn, styles.dangerBtn]} onPress={() => {
        Alert.alert(
          "Novo Jogo",
          "Tem certeza? Isso apagará seu progresso atual (não afeta os jogos salvos manualmente).",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Sim, Novo Jogo",
              style: "destructive",
              onPress: async () => {
                if (session && staticWorldData) {
                  const initialState = createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
                  await (session as any).resetToNewGame(initialState);
                  Alert.alert("Sucesso", "Um novo império acaba de nascer!");
                }
              }
            }
          ]
        );
      }}>
        <Text style={[styles.menuBtnText, styles.dangerText]}>⚠️ Iniciar Novo Jogo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: 28, color: '#D4AF37', fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#E0E0E0', fontWeight: 'bold', width: '100%', marginBottom: 12, marginTop: 10 },
  
  speedControlBox: { width: '100%', maxWidth: 400, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2C', marginBottom: 20 },
  speedControlTitle: { color: '#D4AF37', fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  speedBtnsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  speedBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#2C2C2C' },
  speedBtnActive: { backgroundColor: '#D4AF37' },
  speedBtnText: { color: '#E0E0E0', fontWeight: 'bold' },
  speedBtnTextActive: { color: '#121212' },

  slotCard: { width: '100%', maxWidth: 400, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2C', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotInfo: { flex: 1 },
  slotTitle: { color: '#D4AF37', fontSize: 16, fontWeight: 'bold' },
  slotDetails: { color: '#E0E0E0', fontSize: 14, marginTop: 4 },
  slotDate: { color: '#888', fontSize: 12, marginTop: 2 },
  slotEmpty: { color: '#666', fontStyle: 'italic', marginTop: 4 },
  slotActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: '#444' },
  loadBtn: { backgroundColor: '#1A3C34', borderColor: '#2E8B57' },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  menuBtn: { width: '100%', maxWidth: 400, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2C', marginBottom: 16, alignItems: 'center' },
  menuBtnText: { color: '#E0E0E0', fontSize: 16, fontWeight: 'bold' },
  dangerBtn: { borderColor: '#8B0000', marginTop: 10 },
  dangerText: { color: '#E24A4A' },
});
