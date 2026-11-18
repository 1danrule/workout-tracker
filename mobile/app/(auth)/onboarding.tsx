import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../services/api';
import type { Profile } from '../../types';

type Sex = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';
type Goal = 'bulk' | 'cut' | 'maintain';

const ACTIVITY_OPTIONS: Array<{ key: ActivityLevel; title: string; desc: string; icon: string }> = [
  { key: 'sedentary', title: 'Sedentary', desc: 'Little or no exercise, desk job', icon: 'bed-outline' },
  { key: 'light', title: 'Lightly Active', desc: 'Workouts 1-3 times a week', icon: 'walk-outline' },
  { key: 'moderate', title: 'Moderately Active', desc: 'Workouts 3-5 times a week', icon: 'fitness-outline' },
  { key: 'high', title: 'Very Active', desc: 'Intense workouts 6-7 days a week', icon: 'bicycle-outline' },
  { key: 'very_high', title: 'Extremely Active', desc: 'Physical job or 2x/day training', icon: 'flame-outline' },
];

const GOAL_OPTIONS: Array<{ key: Goal; title: string; desc: string; icon: string }> = [
  { key: 'cut', title: 'Lose Weight (Cut)', desc: 'Caloric deficit (-400 kcal) for fat loss', icon: 'trending-down-outline' },
  { key: 'maintain', title: 'Maintain Weight', desc: 'Keep your current weight & improve tone', icon: 'reorder-two-outline' },
  { key: 'bulk', title: 'Gain Muscle (Bulk)', desc: 'Caloric surplus (+300 kcal) for muscle growth', icon: 'trending-up-outline' },
];

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile, refreshProfile } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [sex, setSex] = useState<Sex>((profile?.sex as Sex) || 'male');
  const [age, setAge] = useState<string>(profile?.age ? String(profile.age) : '25');
  const [heightCm, setHeightCm] = useState<string>(profile?.height_cm ? String(profile.height_cm) : '175');
  const [weightKg, setWeightKg] = useState<string>(profile?.weight_kg ? String(profile.weight_kg) : '70');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>((profile?.activity_level as ActivityLevel) || 'moderate');
  const [goal, setGoal] = useState<Goal>((profile?.goal as Goal) || 'maintain');
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (step === 2) {
      const a = parseInt(age, 10);
      const h = parseFloat(heightCm);
      const w = parseFloat(weightKg);
      if (!a || a < 10 || a > 120) {
        Alert.alert('Invalid Age', 'Please enter a valid age between 10 and 120.');
        return;
      }
      if (!h || h < 80 || h > 250) {
        Alert.alert('Invalid Height', 'Please enter a valid height between 80 and 250 cm.');
        return;
      }
      if (!w || w < 30 || w > 300) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight between 30 and 300 kg.');
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      await updateProfile({
        sex,
        age: parseInt(age, 10),
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        activity_level: activityLevel,
        goal,
      });
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const skipOnboarding = () => {
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>Step {step} of 4</Text>
        <TouchableOpacity onPress={skipOnboarding} style={styles.headerBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step 1: Sex */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your biological sex?</Text>
            <Text style={styles.stepSubtitle}>
              Used to accurately calculate your Basal Metabolic Rate (BMR) with the Mifflin-St Jeor formula.
            </Text>

            <View style={styles.cardsRow}>
              <TouchableOpacity
                style={[styles.sexCard, sex === 'male' && styles.cardSelected]}
                onPress={() => setSex('male')}
              >
                <Ionicons
                  name="male"
                  size={52}
                  color={sex === 'male' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.cardTitle, sex === 'male' && styles.cardTitleSelected]}>
                  Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sexCard, sex === 'female' && styles.cardSelected]}
                onPress={() => setSex('female')}
              >
                <Ionicons
                  name="female"
                  size={52}
                  color={sex === 'female' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.cardTitle, sex === 'female' && styles.cardTitleSelected]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Body stats */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your body measurements</Text>
            <Text style={styles.stepSubtitle}>
              These metrics help us accurately calculate your daily caloric and protein targets.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age (years)</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor={colors.textLight}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="175"
                placeholderTextColor={colors.textLight}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor={colors.textLight}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              />
            </View>
          </View>
        )}

        {/* Step 3: Activity Level */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How active are you?</Text>
            <Text style={styles.stepSubtitle}>
              We use this multiplier to determine your Total Daily Energy Expenditure (TDEE).
            </Text>

            {ACTIVITY_OPTIONS.map((item) => {
              const isSelected = activityLevel === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.optionCard, isSelected && styles.cardSelected]}
                  onPress={() => setActivityLevel(item.key)}
                >
                  <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={isSelected ? colors.white : colors.text}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                      {item.title}
                    </Text>
                    <Text style={styles.optionDesc}>{item.desc}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 4: Primary Goal */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What is your main goal?</Text>
            <Text style={styles.stepSubtitle}>
              We will customize your daily calories, protein, carbs and fats accordingly.
            </Text>

            {GOAL_OPTIONS.map((item) => {
              const isSelected = goal === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.optionCard, isSelected && styles.cardSelected]}
                  onPress={() => setGoal(item.key)}
                >
                  <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={isSelected ? colors.white : colors.text}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                      {item.title}
                    </Text>
                    <Text style={styles.optionDesc}>{item.desc}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.btnDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {step === 4 ? 'Calculate & Finish' : 'Continue'}
              </Text>
              <Ionicons
                name={step === 4 ? 'checkmark' : 'arrow-forward'}
                size={20}
                color={colors.white}
                style={{ marginLeft: 6 }}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 12,
  },
  headerBtn: {
    minWidth: 50,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  sexCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 14,
  },
  cardTitleSelected: {
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: Colors.text,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleSelected: {
    backgroundColor: Colors.primary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
});
