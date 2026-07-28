import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EPIC_CHARACTERS } from '../../assets/data/epic-characters';
import { getLocalPortrait } from '../../assets/portraits';

interface AvatarRendererProps {
  cultureId?: string;
  seed?: string;
  gender?: 'male' | 'female';
  size?: number;
  borderColor?: string;
  showBorder?: boolean;
  epicId?: string;
}

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
};

export default function AvatarRenderer({
  cultureId = 'latin',
  seed = 'default',
  gender = 'male',
  size = 64,
  borderColor,
  showBorder = true,
  epicId,
}: AvatarRendererProps) {
  
  const epic = epicId ? EPIC_CHARACTERS[epicId] : null;
  const finalCultureId = epic?.cultureId || cultureId;
  const finalGender = epic?.gender || gender;
  const portraitId = epic?.portraitId || '';
  const finalSeed = epic?.name || seed;
  
  const themeColor = borderColor || CULTURE_COLORS[finalCultureId] || '#D4AF37';

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor: themeColor,
    backgroundColor: '#1E1E1E',
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {getLocalPortrait(portraitId, finalCultureId, finalGender, finalSeed)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
