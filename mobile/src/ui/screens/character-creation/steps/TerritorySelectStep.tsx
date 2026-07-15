import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface TerritorySelectStepProps {
  selectedRegionId: string;
  onSelectRegion: (regionId: string) => void;
}

interface RegionOption {
  id: string;
  name: string;
  biome: string;
  icon: string;
  desc: string;
  bonus: string;
}

const REGION_OPTIONS: RegionOption[] = [
  {
    id: 'r_hex_38160',
    name: 'Península Ibérica (Europa)',
    biome: 'Temperado',
    icon: '🏰',
    desc: 'Costas rochosas europeias que favorecem uma defesa sólida e expansão naval.',
    bonus: '+15% Defesa & Velocidade de Viagem Marítima',
  },
  {
    id: 'r_hex_32989',
    name: 'Vale dos Grandes Rios (Ásia)',
    biome: 'Fértil',
    icon: '🌾',
    desc: 'Ricas terras no extremo oriente com abundante produção de alimentos e clima favorável.',
    bonus: '+20% Produção de Alimento & Crescimento Populacional',
  },
  {
    id: 'r_hex_30423',
    name: 'Oásis do Saara (África)',
    biome: 'Árido',
    icon: '🐪',
    desc: 'Rotas de comércio no norte da África conectando dunas e caravanas de ouro.',
    bonus: '+25% de Receita de Tarifas & Bônus de Ouro',
  },
  {
    id: 'r_hex_10286',
    name: 'Cordilheira dos Andes (América)',
    biome: 'Montanha',
    icon: '⛰️',
    desc: 'Terras altas sul-americanas acidentadas, ricas em ferro e impenetráveis.',
    bonus: '+20% Produção de Ferro & Resistência a Revoltas',
  },
];

export default function TerritorySelectStep({ selectedRegionId, onSelectRegion }: TerritorySelectStepProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.stepTitle}>Escolha a Região Inicial</Text>
      <Text style={styles.stepSubtitle}>
        Selecione o berço de sua civilização. O bioma local determinará os rendimentos iniciais de recursos e vantagens estratégicas.
      </Text>

      <View style={styles.list}>
        {REGION_OPTIONS.map((option) => {
          const isSelected = selectedRegionId === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.card, isSelected && styles.selectedCard]}
              onPress={() => onSelectRegion(option.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{option.icon}</Text>
                <View style={styles.cardTitleBox}>
                  <Text style={[styles.cardTitle, isSelected && styles.selectedText]}>{option.name}</Text>
                  <Text style={styles.biomeTag}>Bioma: {option.biome}</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>{option.desc}</Text>
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusText}>✨ {option.bonus}</Text>
              </View>
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
  list: {
    gap: 14,
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
  biomeTag: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#AAA',
    marginBottom: 10,
    lineHeight: 18,
  },
  bonusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderColor: '#50E3C2',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bonusText: {
    color: '#50E3C2',
    fontSize: 12,
    fontWeight: '600',
  },
});
