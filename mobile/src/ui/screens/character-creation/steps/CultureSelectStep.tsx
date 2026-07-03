import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CultureId, DEFAULT_CULTURES, generateCulturalName } from '../../../../core/simulation/systems/culture-generator';

interface CultureSelectStepProps {
  selectedCulture: CultureId;
  onSelectCulture: (culture: CultureId) => void;
}

const CULTURE_DETAILS: Record<CultureId, { name: string; icon: string; desc: string; traitBonus: string }> = {
  nordic: { name: 'Clãs Nórdicos', icon: '⚔️', desc: 'Mestres da navegação marítima, sobrevivência no frio e táticas brutais de saque.', traitBonus: '+2 Marcial, +1 Intriga' },
  latin: { name: 'Império Latino', icon: '🏛️', desc: 'Arquitetos da lei, legiões pesadas e administração imperial.', traitBonus: '+2 Administração, +1 Diplomacia' },
  eastern: { name: 'Dinastia Oriental', icon: '🐉', desc: 'Guardiões da sabedoria antiga, filosofia e governança disciplinada.', traitBonus: '+2 Saber, +1 Administração' },
  desert: { name: 'Nômades do Deserto', icon: '🦅', desc: 'Soberanos das rotas comerciais, cavalaria rápida e astronomia.', traitBonus: '+2 Diplomacia, +1 Saber' },
  celtic: { name: 'Tribos Célticas', icon: '🌳', desc: 'Conexão profunda com a natureza, guerreiros ferozes e bardos místicos.', traitBonus: '+2 Marcial, +1 Saber' },
  slavic: { name: 'Reinos Eslavos', icon: '🐻', desc: 'Resistentes habitantes das florestas com resistência e força inigualáveis.', traitBonus: '+2 Administração, +1 Marcial' },
  savanna: { name: 'Reinos da Savana', icon: '🦁', desc: 'Ricos senhores do ouro, mestres do comércio de marfim e historiadores orais.', traitBonus: '+2 Diplomacia, +1 Administração' },
  indigenous: { name: 'Confederação Indígena', icon: '🐆', desc: 'Emboscadores furtivos, herboristas e líderes ritualísticos.', traitBonus: '+2 Intriga, +1 Marcial' },
  vedic: { name: 'Império Védico', icon: '🪷', desc: 'Estudiosos da ascensão espiritual, matemática e grandes monumentos.', traitBonus: '+2 Saber, +1 Diplomacia' },
};

export default function CultureSelectStep({ selectedCulture, onSelectCulture }: CultureSelectStepProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.stepTitle}>Escolha sua Herança</Text>
      <Text style={styles.stepSubtitle}>
        A origem de sua dinastia molda suas tradições, doutrinas marciais e nomes dos governantes.
      </Text>

      <View style={styles.grid}>
        {DEFAULT_CULTURES.map((cultureKey) => {
          const details = CULTURE_DETAILS[cultureKey];
          const isSelected = selectedCulture === cultureKey;
          const sampleName = generateCulturalName(cultureKey, 'male');

          return (
            <TouchableOpacity
              key={cultureKey}
              style={[styles.card, isSelected && styles.selectedCard]}
              onPress={() => onSelectCulture(cultureKey)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{details.icon}</Text>
                <View style={styles.cardTitleBox}>
                  <Text style={[styles.cardTitle, isSelected && styles.selectedText]}>{details.name}</Text>
                  <Text style={styles.traitBonus}>{details.traitBonus}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{details.desc}</Text>
              <Text style={styles.sampleName}>Exemplo de Nome: <Text style={styles.sampleHighlight}>{sampleName}</Text></Text>
            </TouchableOpacity>
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
    marginBottom: 20,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2C2C2C',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  selectedCard: {
    borderColor: '#D4AF37',
    backgroundColor: '#242014',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  selectedText: {
    color: '#D4AF37',
  },
  traitBonus: {
    fontSize: 12,
    color: '#50E3C2',
    marginTop: 2,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 13,
    color: '#AAA',
    marginBottom: 8,
    lineHeight: 18,
  },
  sampleName: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  sampleHighlight: {
    color: '#CCC',
    fontStyle: 'normal',
  },
});
