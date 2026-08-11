/**
 * HudAwareScreen — Wrapper para telas que precisam compensar o TopHUD flutuante.
 *
 * Uso:
 *   <HudAwareScreen>
 *     <SeuConteudo />
 *   </HudAwareScreen>
 *
 * Lê hudHeight do store (publicado pelo TopHUD via onLayout) e aplica
 * paddingTop = insets.top + hudHeight para que o conteúdo nunca seja
 * encoberto pelo header flutuante.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../store/game-store';

interface HudAwareScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function HudAwareScreen({ children, style }: HudAwareScreenProps) {
  const insets    = useSafeAreaInsets();
  const hudHeight = useUIStore((s) => s.hudHeight);

  return (
    <View style={[styles.root, { paddingTop: insets.top + hudHeight }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
