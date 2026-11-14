import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { updateProfile, getProfile } from '../../services/api';
import type { Profile } from '../../types';

interface PickerOption {
  label: string;
  value: string;
}

const SEX_OPTIONS: PickerOption[] = [
  { label: 'Select Sex...', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const GOAL_OPTIONS: PickerOption[] = [
  { label: 'Select Goal...', value: '' },
  { label: 'Muscle Gain (Bulk)', value: 'bulk' },
  { label: 'Fat Loss (Cut)', value: 'cut' },
  { label: 'Maintain Weight', value: 'maintain' },
];

const ACTIVITY_OPTIONS: PickerOption[] = [
  { label: 'Select Activity Level...', value: '' },
  { label: 'Sedentary (Little or no exercise)', value: 'sedentary' },
  { label: 'Light (1-3 workouts / week)', value: 'light' },
  { label: 'Moderate (3-5 workouts / week)', value: 'moderate' },
  { label: 'High (6-7 workouts / week)', value: 'high' },
  { label: 'Very High (Physical job / 2x a day)', value: 'very_high' },
];

export default function ProfileScreen() {
  const { profile: authProfile, refreshProfile, logout } = useAuth();
  const { mode, setMode, colors, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Profile['sex']>('');
  const [activityLevel, setActivityLevel] = useState<Profile['activity_level']>('');
  const [goal, setGoal] = useState<Profile['goal']>('');

  // Picker Modal State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([]);
  const [pickerSelected, setPickerSelected] = useState('');
  const [pickerOnSelect, setPickerOnSelect] = useState<(val: string) => void>(() => () => {});

  const populateFields = (p: Profile) => {
    setWeightKg(p.weight_kg !== null && p.weight_kg !== undefined ? String(p.weight_kg) : '');
    setHeightCm(p.height_cm !== null && p.height_cm !== undefined ? String(p.height_cm) : '');
    setAge(p.age !== null && p.age !== undefined ? String(p.age) : '');
    setSex(p.sex || '');
    setActivityLevel(p.activity_level || '');
    setGoal(p.goal || '');
  };

  useEffect(() => {
    if (authProfile) {
      populateFields(authProfile);
    } else {
      (async () => {
        setLoading(true);
        try {
          const fresh = await getProfile();
          populateFields(fresh);
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [authProfile]);

  const openPicker = (
    title: string,
    options: PickerOption[],
    selected: string,
    onSelect: (val: string) => void
  ) => {
    setPickerTitle(title);
    setPickerOptions(options);
    setPickerSelected(selected);
    setPickerOnSelect(() => onSelect);
    setPickerVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        sex,
        activity_level: activityLevel,
        goal,
        weight_kg: weightKg.trim() ? parseFloat(weightKg) : null,
        height_cm: heightCm.trim() ? parseInt(heightCm, 10) : null,
        age: age.trim() ? parseInt(age, 10) : null,
      };

      await updateProfile(payload);
      await refreshProfile();
      Alert.alert('Profile Updated', 'Your profile and targets have been updated successfully!');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getLabel = (options: PickerOption[], value: string) => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : 'Select...';
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={Colors.primaryDark} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.usernameText, { color: colors.text }]}>{authProfile?.username || 'User'}</Text>
            <Text style={styles.emailText}>{authProfile?.email || 'user@example.com'}</Text>
          </View>
        </View>

        {/* Section: Physical Stats */}
        <Text style={styles.sectionHeader}>Body Metrics</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Weight (kg)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              keyboardType="numeric"
              placeholder="e.g. 75.5"
              placeholderTextColor={Colors.textLight}
              value={weightKg}
              onChangeText={setWeightKg}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Height (cm)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              keyboardType="numeric"
              placeholder="e.g. 178"
              placeholderTextColor={Colors.textLight}
              value={heightCm}
              onChangeText={setHeightCm}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              keyboardType="numeric"
              placeholder="e.g. 25"
              placeholderTextColor={Colors.textLight}
              value={age}
              onChangeText={setAge}
            />
          </View>
        </View>

        {/* Section: Goal & Lifestyle */}
        <Text style={styles.sectionHeader}>Goals & Lifestyle</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Sex Picker */}
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() =>
              openPicker('Select Sex', SEX_OPTIONS, sex, (val) => setSex(val as Profile['sex']))
            }
          >
            <Text style={[styles.inputLabel, { color: colors.text }]}>Biological Sex</Text>
            <View style={styles.pickerValueRow}>
              <Text style={sex ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {getLabel(SEX_OPTIONS, sex)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Goal Picker */}
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() =>
              openPicker('Fitness Goal', GOAL_OPTIONS, goal, (val) => setGoal(val as Profile['goal']))
            }
          >
            <Text style={[styles.inputLabel, { color: colors.text }]}>Fitness Goal</Text>
            <View style={styles.pickerValueRow}>
              <Text style={goal ? styles.pickerValueText : styles.pickerPlaceholderText}>
                {getLabel(GOAL_OPTIONS, goal)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Activity Level Picker */}
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() =>
              openPicker(
                'Activity Level',
                ACTIVITY_OPTIONS,
                activityLevel,
                (val) => setActivityLevel(val as Profile['activity_level'])
              )
            }
          >
            <Text style={[styles.inputLabel, { color: colors.text }]}>Activity Level</Text>
            <View style={styles.pickerValueRow}>
              <Text
                style={[
                  activityLevel ? styles.pickerValueText : styles.pickerPlaceholderText,
                  { maxWidth: 170 },
                ]}
                numberOfLines={1}
              >
                {getLabel(ACTIVITY_OPTIONS, activityLevel)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Appearance (Theme) */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                mode === "system" && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setMode("system")}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={mode === "system" ? colors.primaryDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === "system" ? colors.primaryDark : colors.textSecondary },
                ]}
              >
                Auto (System)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                mode === "light" && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setMode("light")}
            >
              <Ionicons
                name="sunny-outline"
                size={20}
                color={mode === "light" ? colors.primaryDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === "light" ? colors.primaryDark : colors.textSecondary },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                mode === "dark" && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setMode("dark")}
            >
              <Ionicons
                name="moon-outline"
                size={20}
                color={mode === "dark" ? colors.primaryDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === "dark" ? colors.primaryDark : colors.textSecondary },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DROPDOWN / PICKER MODAL */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{pickerTitle}</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === pickerSelected;
                return (
                  <TouchableOpacity
                    style={styles.modalOptionRow}
                    onPress={() => {
                      pickerOnSelect(item.value);
                      setPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  themeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    padding: 6,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 6,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  emailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  textInput: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickerValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  pickerPlaceholderText: {
    fontSize: 15,
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceVariant,
    marginLeft: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  modalOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  modalOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
