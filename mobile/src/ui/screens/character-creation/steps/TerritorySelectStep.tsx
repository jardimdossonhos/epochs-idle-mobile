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
    id: 'r_hex_10286',
    name: 'Vale Fértil Temperado',
    biome: 'Temperado',
    icon: '🌾',
    desc: 'Ricas terras ribeirinhas verdes com abundante produção de alimentos e clima ameno.',
    bonus: '+15% de Produção de Alimento & Crescimento Populacional',
  },
  {
    id: 'r_hex_10287',
    name: 'Porto Seguro Costeiro',
    biome: 'Costeiro',
    icon: '🌊',
    desc: 'Baía protegida que favorece o comércio marítimo, pesca e exploração inicial.',
    bonus: '+20% de Receita de Tarifas & Velocidade de Viagem Marítima',
  },
  {
    id: 'r_hex_10288',
    name: 'Fronteira de Montanha Árida',
    biome: 'Árido',
    icon: '⛰️',
    desc: 'Terras altas acidentadas ricas em depósitos de ferro e barreiras defensivas naturais.',
    bonus: '+25% de Produção de Ferro & Bônus de Defesa',
  },
  {
    id: 'r_hex_10289',
    name: 'Grandes Planícies da Estepe',
    biome: 'Estepe',
    icon: '🏹',
    desc: 'Vastas pastagens abertas ideais para criação de cavalos e manobras rápidas de cavalaria.',
    bonus: '+20% de Velocidade de Cavalaria & Redução de Upkeep do Exército',
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
