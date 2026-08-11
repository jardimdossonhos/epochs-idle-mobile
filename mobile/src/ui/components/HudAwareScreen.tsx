/**
 * HudAwareScreen — Wrapper para telas que precisam compensar o TopHUD flutuante.
 *
 * Uso:
 *   <HudAwareScreen>
 *     <SeuConteudo />
 *   </HudAwareScreen>
 *
 * Lê hudHeight do store (publicado pelo TopHUD via onLayout) e aplica
 * paddingTop = hudHeight para que o conteúdo fique logo abaixo do header
 * flutuante.
 *
 * IMPORTANTE: NÃO somar insets.top aqui. O TopHUD já se mede com o notch
 * incluído (paddingTop: insets.top + 4) e publica esse valor total em
 * hudHeight. Somar insets.top novamente causaria o "Abismo Negro".
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useUIStore } from '../store/game-store';

interface HudAwareScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function HudAwareScreen({ children, style }: HudAwareScreenProps) {
  const hudHeight = useUIStore((s) => s.hudHeight);

  return (
    <View style={[styles.root, { paddingTop: hudHeight }, style]}>
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
