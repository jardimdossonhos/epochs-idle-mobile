import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useGameState } from '../GameProvider';
import { listTechnologyNodes, isTechnologyUnlocked, isTechnologyAvailable } from '../../core/data/technology-tree';

export default function TechScreen() {
  const { gameState, session, playerKingdomId } = useGameState();

  if (!gameState || !session) return null;

  const kingdom = gameState.kingdoms[playerKingdomId];
  if (!kingdom) return null;

  const techState = kingdom.technology;
  const learningIncome = Object.values(gameState.world.characters || {})
    .filter((char: any) => char.employerKingdomId === playerKingdomId)
    .reduce((acc: number, char: any) => acc + (char.stats?.learning || 0), 0);
  
  const allTechNodes = listTechnologyNodes();

  const handleResearch = (techId: string) => {
    if (isTechnologyUnlocked(techState, techId)) {
      Alert.alert("Já Concluído", "Sua civilização já domina este conhecimento.");
      return;
    }
    if (!isTechnologyAvailable(techState, techId)) {
      Alert.alert("Requisitos Ausentes", "Você precisa desbloquear as tecnologias pré-requisito primeiro.");
      return;
    }
    
    if (typeof (session as any).setResearchTarget === 'function') {
      (session as any).setResearchTarget(techId);
    } else if (typeof (session as any).setResearchGoal === 'function') {
      (session as any).setResearchGoal(techId);
    } else {
      techState.activeResearchId = techId;
    }
    Alert.alert("Foco Alterado", "Seus sábios agora estão concentrados nesta pesquisa.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Árvore do Conhecimento</Text>
        <Text style={styles.subtitle}>Progresso: {Math.floor(techState.accumulatedResearch)} Pts (Foco: {techState.researchFocus?.toUpperCase() || 'LIVRE'})</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.list}>
        {allTechNodes.map((tech) => {
          const unlocked = isTechnologyUnlocked(techState, tech.id);
          const available = isTechnologyAvailable(techState, tech.id);
          const isResearching = techState.activeResearchId === tech.id || techState.researchGoalId === tech.id;
          const progressPct = Math.min(100, Math.floor((techState.accumulatedResearch / tech.cost) * 100));

          return (
            <TouchableOpacity 
              key={tech.id} 
              style={[
                styles.techCard, 
                unlocked && styles.unlockedCard,
                isResearching && styles.researchingCard,
                !unlocked && !available && styles.lockedCard
              ]}
              onPress={() => handleResearch(tech.id)}
              disabled={!available && !unlocked}
            >
              <View style={styles.techHeader}>
                <Text style={styles.techName}>{tech.name}</Text>
                <Text style={styles.techCost}>{tech.cost} pts</Text>
              </View>
              <Text style={styles.techDomain}>Domínio: {tech.domain.toUpperCase()}</Text>
              <Text style={styles.techDesc}>{tech.description}</Text>
              
              <View style={styles.statusBox}>
                {unlocked ? (
                  <Text style={styles.statusTextUnlocked}>✅ Domínio Concluído</Text>
                ) : isResearching ? (
                  <Text style={styles.statusTextResearching}>🔬 Pesquisando... ({progressPct}%)</Text>
                ) : available ? (
                  <Text style={styles.statusTextAvailable}>💡 Disponível (Toque p/ Pesquisar)</Text>
                ) : (
                  <Text style={styles.statusTextLocked}>🔒 Requisitos Pendentes ({tech.required.join(', ')})</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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
  title: { fontSize: 24, color: '#D4AF37', fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#50E3C2', marginTop: 4, fontWeight: 'bold' },
  list: { padding: 16, paddingBottom: 40 },
  techCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  unlockedCard: { borderColor: '#D4AF37', backgroundColor: '#1E1A0F' },
  researchingCard: { borderColor: '#50E3C2' },
  lockedCard: { opacity: 0.6, borderColor: '#222' },
  techHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  techName: { color: '#E0E0E0', fontSize: 18, fontWeight: 'bold' },
  techCost: { color: '#9013FE', fontSize: 16, fontWeight: 'bold' },
  techDomain: { color: '#4A90E2', fontSize: 11, fontWeight: 'bold', marginBottom: 8 },
  techDesc: { color: '#888', fontSize: 14, marginBottom: 12 },
  statusBox: { alignItems: 'flex-end' },
  statusText: { color: '#666', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  statusTextUnlocked: { color: '#D4AF37', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  statusTextResearching: { color: '#50E3C2', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  statusTextAvailable: { color: '#F8E71C', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
  statusTextLocked: { color: '#666', fontSize: 11, textTransform: 'uppercase' },
});
