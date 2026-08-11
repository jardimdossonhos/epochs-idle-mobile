import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useUiStore } from '../../stores/use-ui-store';

export function ImperialOverlay() {
  const { imperialDispatches, hasNewDispatch, clearNewDispatchBadge } = useUiStore();
  const [isOpen, setIsOpen] = useState(false);
  const [toastAnim] = useState(new Animated.Value(0));

  // Efeito Toast (Notification)
  useEffect(() => {
    if (hasNewDispatch && !isOpen) {
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(4000),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start();
    }
  }, [hasNewDispatch, isOpen]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen && hasNewDispatch) {
      clearNewDispatchBadge();
      toastAnim.setValue(0);
    }
  };

  return (
    <>
      {/* Toast Animado Removido a pedido do usuário (usando apenas o badge) */}

      {/* Botão Flutuante (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={togglePanel}>
        <Text style={styles.fabIcon}>📜</Text>
        {hasNewDispatch && !isOpen && <View style={styles.badge} />}
      </TouchableOpacity>

      {/* Painel Histórico Rolável */}
      {isOpen && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Arquivos Imperiais</Text>
            <TouchableOpacity onPress={togglePanel}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll}>
            {imperialDispatches.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum relato registrado nesta era.</Text>
            ) : (
              imperialDispatches.map((dispatch) => (
                <View key={dispatch.id} style={styles.dispatchCard}>
                  <Text style={styles.dispatchDate}>{new Date(dispatch.timestamp).toLocaleTimeString()}</Text>
                  <Text style={styles.dispatchContent}>{dispatch.content}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
    elevation: 5,
  },
  toastText: {
    color: '#000',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    backgroundColor: '#2D3748',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
    zIndex: 90,
  },
  fabIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    backgroundColor: '#E53E3E',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#2D3748',
  },
  panel: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 320,
    height: 400,
    backgroundColor: 'rgba(26, 32, 44, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A5568',
    zIndex: 90,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#2D3748',
    borderBottomWidth: 1,
    borderColor: '#4A5568',
  },
  panelTitle: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    color: '#A0AEC0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scroll: {
    padding: 15,
  },
  emptyText: {
    color: '#A0AEC0',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  dispatchCard: {
    backgroundColor: '#2D3748',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  dispatchDate: {
    color: '#A0AEC0',
    fontSize: 10,
    marginBottom: 4,
  },
  dispatchContent: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  }
});
