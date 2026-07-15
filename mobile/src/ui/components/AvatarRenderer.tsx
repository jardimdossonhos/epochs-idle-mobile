import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface AvatarRendererProps {
  cultureId?: string;
  seed?: string;
  gender?: 'male' | 'female';
  size?: number;
  borderColor?: string;
  showBorder?: boolean;
}

const CULTURE_EMOJIS: Record<string, string> = {
  nordic: '⚔️',
  latin: '👑',
  eastern: '🐉',
  desert: '🦅',
  celtic: '🌳',
  slavic: '🐻',
  savanna: '🦁',
  indigenous: '🐆',
  vedic: '🪷',
};

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

export function getAvatarUrl(
  cultureId: string = 'latin',
  seed: string = 'default',
  gender: 'male' | 'female' = 'male'
): string {
  const safeSeed = seed || 'sovereign_1';
  let style = 'lorelei';
  let params = `seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;

  switch (cultureId) {
    case 'nordic':
      style = 'adventurer';
      params += `&skinColor=f1c27d,ffdbb4&hairColor=e8c547,b5a642`;
      break;
    case 'eastern':
      style = 'avataaars';
      params += `&skinColor=ffd8b1,f1c27d&hairColor=2c150c,090909`;
      break;
    case 'desert':
      style = 'micah';
      params += `&baseColor=d6a374,ae5b36,80461b&hairColor=2c150c,000000`;
      break;
    case 'savanna':
      style = 'micah';
      params += `&baseColor=ae5b36,5c2f17,80461b&hairColor=000000`;
      break;
    case 'celtic':
      style = 'adventurer';
      params += `&skinColor=ffdbb4,f1c27d&hairColor=b95a20,e8c547,b5a642`;
      break;
    case 'slavic':
      style = 'lorelei';
      params += `&skinColor=ffdbb4,f1c27d&hairColor=e8c547,b5a642,a56b46`;
      break;
    case 'indigenous':
      style = 'avataaars';
      params += `&skinColor=d6a374,ae5b36,80461b&hairColor=090909`;
      break;
    case 'vedic':
      style = 'micah';
      params += `&baseColor=ae5b36,80461b,f1c27d&hairColor=2c150c,000000`;
      break;
    default:
      style = 'lorelei';
      params += `&skinColor=ffdbb4,f1c27d`;
      break;
  }

  if (gender === 'female') {
    params += `&facialHairProbability=0&facialHair[]`;
  } else {
    params += `&facialHairProbability=50`;
  }

  return `https://api.dicebear.com/9.x/${style}/png?${params}`;
}

function getBackgroundColorWithAlpha(color: string): string {
  if (color.startsWith('#') && color.length === 7) {
    return color + '33';
  }
  if (color.startsWith('#') && color.length === 9) {
    return color;
  }
  if (color.startsWith('#') && color.length === 4) {
    const r = color[1], g = color[2], b = color[3];
    return `#${r}${r}${g}${g}${b}${b}33`;
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', ', 0.2)');
  }
  if (color.startsWith('rgba(')) {
    return color;
  }
  return 'rgba(212, 175, 55, 0.2)';
}

export default function AvatarRenderer({
  cultureId = 'latin',
  seed = 'default',
  gender = 'male',
  size = 64,
  borderColor,
  showBorder = true,
}: AvatarRendererProps) {
  const [hasError, setHasError] = useState(false);
  const avatarUrl = getAvatarUrl(cultureId, seed, gender);
  const fallbackEmoji = CULTURE_EMOJIS[cultureId] || '👑';
  const themeColor = borderColor || CULTURE_COLORS[cultureId] || '#D4AF37';

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
      {!hasError ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.image}
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[styles.fallbackContainer, { backgroundColor: getBackgroundColorWithAlpha(themeColor) }]}>
          <Text style={{ fontSize: size * 0.45 }}>{fallbackEmoji}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
