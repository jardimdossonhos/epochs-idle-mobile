import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CultureId, DEFAULT_CULTURES, generateCulturalName } from '../../../../core/simulation/systems/culture-generator';

interface CultureSelectStepProps {
  selectedCulture: CultureId;
  onSelectCulture: (culture: CultureId) => void;
}

const CULTURE_DETAILS: Record<CultureId, { name: string; icon: string; desc: string; traitBonus: string }> = {
  nordic: { name: 'Nordic Clans', icon: '⚔️', desc: 'Masters of sea navigation, cold survival, and brutal raid tactics.', traitBonus: '+2 Martial, +1 Intrigue' },
  latin: { name: 'Latin Empire', icon: '🏛️', desc: 'Architects of law, heavy legions, and imperial administration.', traitBonus: '+2 Administration, +1 Diplomacy' },
  eastern: { name: 'Eastern Dynasty', icon: '🐉', desc: 'Guardians of ancient wisdom, philosophy, and disciplined statecraft.', traitBonus: '+2 Learning, +1 Administration' },
  desert: { name: 'Desert Nomads', icon: '🦅', desc: 'Sovereigns of trade routes, swift cavalry, and astronomy.', traitBonus: '+2 Diplomacy, +1 Learning' },
  celtic: { name: 'Celtic Tribes', icon: '🌳', desc: 'Deep connection to nature, fierce warriors, and mystic bards.', traitBonus: '+2 Martial, +1 Learning' },
  slavic: { name: 'Slavic Realms', icon: '🐻', desc: 'Resilient forest dwellers with unmatched endurance and fortitude.', traitBonus: '+2 Administration, +1 Martial' },
  savanna: { name: 'Savanna Kingdoms', icon: '🦁', desc: 'Wealthy gold lords, ivory trade masters, and oral historians.', traitBonus: '+2 Diplomacy, +1 Administration' },
  indigenous: { name: 'Indigenous Confederation', icon: '🐆', desc: 'Stealth ambushers, herbalists, and ritualistic leaders.', traitBonus: '+2 Intrigue, +1 Martial' },
  vedic: { name: 'Vedic Empire', icon: '🪷', desc: 'Scholars of spiritual ascension, mathematics, and grand monuments.', traitBonus: '+2 Learning, +1 Diplomacy' },
};

export default function CultureSelectStep({ selectedCulture, onSelectCulture }: CultureSelectStepProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.stepTitle}>Choose Your Heritage</Text>
      <Text style={styles.stepSubtitle}>
        The origin of your dynasty shapes your traditions, martial doctrines, and ruler naming.
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
              <Text style={styles.sampleName}>Sample Name: <Text style={styles.sampleHighlight}>{sampleName}</Text></Text>
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
