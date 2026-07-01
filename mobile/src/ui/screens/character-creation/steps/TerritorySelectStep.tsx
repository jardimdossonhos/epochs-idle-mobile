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
    name: 'Temperate Fertile Valley',
    biome: 'Temperate',
    icon: '🌾',
    desc: 'Rich green riverlands with plentiful food growth and gentle climate.',
    bonus: '+15% Food Production & Population Growth',
  },
  {
    id: 'r_hex_10287',
    name: 'Coastal Haven',
    biome: 'Coastal',
    icon: '🌊',
    desc: 'Protected bay favoring maritime trade, fishing, and early exploration.',
    bonus: '+20% Tariff Income & Sea Travel Speed',
  },
  {
    id: 'r_hex_10288',
    name: 'Arid Mountain Frontier',
    biome: 'Arid',
    icon: '⛰️',
    desc: 'Rugged highlands rich in iron deposits and natural defensive barriers.',
    bonus: '+25% Iron Production & Defense Bonus',
  },
  {
    id: 'r_hex_10289',
    name: 'Great Steppe Plains',
    biome: 'Steppe',
    icon: '🏹',
    desc: 'Vast open grasslands ideal for horse breeding and swift cavalry maneuvering.',
    bonus: '+20% Cavalry Speed & Reduced Army Upkeep',
  },
];

export default function TerritorySelectStep({ selectedRegionId, onSelectRegion }: TerritorySelectStepProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.stepTitle}>Choose Starting Region</Text>
      <Text style={styles.stepSubtitle}>
        Select the cradle of your civilization. The local biome will determine early resource yields and strategic advantages.
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
                  <Text style={styles.biomeTag}>Biome: {option.biome}</Text>
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
