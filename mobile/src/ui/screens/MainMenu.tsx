import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useUiStore } from '../stores/use-ui-store';
import { mmkvStorage } from '../memory-persistence'; // Criaremos isso a seguir

export function MainMenu() {
  const { setScene } = useUiStore();
  const [saveList, setSaveList] = useState<string[]>([]);

  const loadSaveList = () => {
    // MMKV get keys
    const keys = mmkvStorage.getAllKeys();
    setSaveList(keys.filter((k: string) => k.startsWith('save_')));
  };

  const handleNewGame = () => {
    // Para novo jogo, deletar o INIT payload
    mmkvStorage.delete('init_payload');
    setScene('SIMULATION');
  };

  const handleLoad = (key: string) => {
    const dataStr = mmkvStorage.getString(key);
    if (dataStr) {
       mmkvStorage.set('init_payload', dataStr); // Buffer temporário para Boot
       setScene('SIMULATION');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EPOCHS IDLE</Text>
      <View style={styles.menuBox}>
        <TouchableOpacity style={styles.btn} onPress={handleNewGame}>
          <Text style={styles.btnText}>Nova Campanha</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btn} onPress={loadSaveList}>
          <Text style={styles.btnText}>Carregar Jogo</Text>
        </TouchableOpacity>

        {saveList.length > 0 && (
          <View style={styles.saveList}>
            {saveList.map(key => (
              <TouchableOpacity key={key} style={styles.saveBtn} onPress={() => handleLoad(key)}>
                <Text style={styles.saveBtnText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#D4AF37', marginBottom: 40, letterSpacing: 4 },
  menuBox: { width: 300 },
  btn: { backgroundColor: '#2D3748', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#D4AF37' },
  btnText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  saveList: { marginTop: 20, padding: 10, backgroundColor: '#1A202C', borderRadius: 8 },
  saveBtn: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#4A5568' },
  saveBtnText: { color: '#E2E8F0' }
});

