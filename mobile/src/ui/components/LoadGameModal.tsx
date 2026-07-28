import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { mmkvStorage } from '../memory-persistence';

interface LoadGameModalProps {
  visible: boolean;
  onClose: () => void;
  onLoadSuccess: (saveKey: string) => void;
}

interface EnrichedSlot {
  slotId: string;
  culture: string;
}

export default function LoadGameModal({ visible, onClose, onLoadSuccess }: LoadGameModalProps) {
  const { t } = useLanguage();
  const [slots, setSlots] = useState<EnrichedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      const keys = mmkvStorage.getAllKeys().filter((k: string) => k.startsWith('save_'));
      const formattedSlots = keys.map((k: string) => ({ slotId: k, culture: 'N/A' }));
      setSlots(formattedSlots);
      setLoading(false);
    }
  }, [visible]);

  const handleLoad = async (slotId: string) => {
    onLoadSuccess(slotId);
  };

  const handleDelete = async (slotId: string) => {
    Alert.alert(
      t('loadGame.deleteConfirmTitle'),
      t('loadGame.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => {
            mmkvStorage.delete(slotId);
            setSlots(prev => prev.filter(s => s.slotId !== slotId));
          }
        }
      ]
    );
  };

  const renderSlot = ({ item }: { item: EnrichedSlot }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotInfo}>
        <Text style={styles.slotId}>{item.slotId}</Text>
      </View>
      <View style={styles.slotActions}>
        <TouchableOpacity style={styles.loadBtn} onPress={() => handleLoad(item.slotId)}>
          <Text style={styles.btnText}>Carregar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.slotId)}>
          <Text style={styles.btnText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('loadGame.title')}</Text>
          {loading ? (
            <ActivityIndicator color="#D4AF37" size="large" />
          ) : slots.length === 0 ? (
            <Text style={styles.emptyText}>{t('loadGame.noSaves')}</Text>
          ) : (
            <FlatList
              data={slots}
              keyExtractor={s => s.slotId}
              renderItem={renderSlot}
              style={{ width: '100%', marginTop: 20 }}
            />
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.btnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', height: '70%', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#D4AF37' },
  emptyText: { color: '#888', marginTop: 40 },
  slotCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#333' },
  slotInfo: { flex: 1 },
  slotId: { color: '#FFF', fontWeight: 'bold' },
  slotActions: { flexDirection: 'row', alignItems: 'center' },
  loadBtn: { backgroundColor: '#D4AF37', padding: 10, borderRadius: 5, marginRight: 10 },
  deleteBtn: { backgroundColor: '#E53E3E', padding: 10, borderRadius: 5 },
  btnText: { color: '#000', fontWeight: 'bold' },
  closeBtn: { marginTop: 20, padding: 15, backgroundColor: '#333', borderRadius: 8, width: '100%', alignItems: 'center' }
});
