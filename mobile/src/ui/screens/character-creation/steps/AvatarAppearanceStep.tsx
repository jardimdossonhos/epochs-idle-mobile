import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AvatarRenderer from '../../../components/AvatarRenderer';
import { CultureId, Gender, generateCulturalName, generatePortraitSeed } from '../../../../core/simulation/systems/culture-generator';

interface AvatarAppearanceStepProps {
  cultureId: CultureId;
  gender: Gender;
  rulerName: string;
  kingdomName: string;
  portraitSeed: string;
  onUpdateDetails: (details: { gender?: Gender; rulerName?: string; kingdomName?: string; portraitSeed?: string }) => void;
}

export default function AvatarAppearanceStep({
  cultureId,
  gender,
  rulerName,
  kingdomName,
  portraitSeed,
  onUpdateDetails,
}: AvatarAppearanceStepProps) {
  const handleRandomizeName = () => {
    const newName = generateCulturalName(cultureId, gender);
    onUpdateDetails({ rulerName: newName });
  };

  const handleRandomizeAvatar = () => {
    const newSeed = generatePortraitSeed();
    onUpdateDetails({ portraitSeed: newSeed });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.stepTitle}>Royal Persona & Identity</Text>
      <Text style={styles.stepSubtitle}>
        Customize your sovereign's appearance, title, and royal realm name.
      </Text>

      {/* Avatar Preview */}
      <View style={styles.avatarPreviewCard}>
        <AvatarRenderer cultureId={cultureId} seed={portraitSeed} gender={gender} size={100} />
        <TouchableOpacity style={styles.randomAvatarBtn} onPress={handleRandomizeAvatar}>
          <Text style={styles.randomBtnText}>🎲 Randomize Appearance</Text>
        </TouchableOpacity>
      </View>

      {/* Inputs Form */}
      <View style={styles.form}>
        {/* Gender Toggle */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender Identity</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderBtnSelected]}
              onPress={() => onUpdateDetails({ gender: 'male' })}
            >
              <Text style={[styles.genderBtnText, gender === 'male' && styles.selectedText]}>Male Sovereign</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderBtnSelected]}
              onPress={() => onUpdateDetails({ gender: 'female' })}
            >
              <Text style={[styles.genderBtnText, gender === 'female' && styles.selectedText]}>Female Sovereign</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ruler Name Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Ruler Name</Text>
            <TouchableOpacity onPress={handleRandomizeName}>
              <Text style={styles.randomizeLink}>🎲 Randomize Name</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textInput}
            value={rulerName}
            onChangeText={(text) => onUpdateDetails({ rulerName: text })}
            placeholder="Enter Ruler Name"
            placeholderTextColor="#666"
          />
        </View>

        {/* Kingdom Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Realm / Realm Name</Text>
          <TextInput
            style={styles.textInput}
            value={kingdomName}
            onChangeText={(text) => onUpdateDetails({ kingdomName: text })}
            placeholder="Enter Kingdom Name"
            placeholderTextColor="#666"
          />
        </View>
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
  avatarPreviewCard: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2C2C2C',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  randomAvatarBtn: {
    marginTop: 14,
    backgroundColor: '#2A2A2A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  randomBtnText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: 'bold',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  randomizeLink: {
    fontSize: 12,
    color: '#50E3C2',
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  genderBtnSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#242014',
  },
  genderBtnText: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedText: {
    color: '#D4AF37',
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
  },
});
