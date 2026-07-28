import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CULTURE_COLORS: Record<string, string> = {
  nordic: '#49657A',
  latin: '#D4AF37',
  eastern: '#C0392B',
  desert: '#E67E22',
  celtic: '#27AE60',
  slavic: '#2C3E50',
  savanna: '#F39C12',
  indigenous: '#8E44AD',
  vedic: '#16A085',
  sinic: '#E74C3C',
  egyptian: '#F1C40F',
  harappa: '#9B59B6',
};

const MALE_EMOJIS = ['👨', '🧔', '👱‍♂️', '👨‍🦱', '👳‍♂️'];
const FEMALE_EMOJIS = ['👩', '👱‍♀️', '👩‍🦱', '👩‍🦰', '🧕'];

export function getLocalPortrait(
  portraitId: string,
  cultureId: string,
  gender: string,
  seed: string
) {
  // If we have an epic portrait ID, use special Epic logic
  if (portraitId) {
    const initials = seed.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return (
      <View style={[styles.container, { backgroundColor: '#FFD70044' }]}>
        <Text style={styles.epicText}>{initials}</Text>
      </View>
    );
  }

  // Generic math logic based on seed
  const bgColor = CULTURE_COLORS[cultureId] || '#333333';
  const sum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const emojis = gender === 'female' ? FEMALE_EMOJIS : MALE_EMOJIS;
  const emojiIndex = sum % emojis.length;
  const emoji = emojis[emojiIndex];

  return (
    <View style={[styles.container, { backgroundColor: `${bgColor}44` }]}>
      <Text style={styles.emojiText}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  epicText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  emojiText: {
    fontSize: 28,
  }
});
