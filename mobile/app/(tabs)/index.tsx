import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getDailySummary, getDiaryEntries, deleteFoodEntry } from '../../services/api';
import type { DailySummary, FoodEntry } from '../../types';
import Svg, { Circle } from 'react-native-svg';

const MEALS: Array<{ key: 'breakfast' | 'lunch' | 'dinner' | 'snack'; label: string; icon: string }> = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'snack', label: 'Snacks', icon: 'cafe-outline' },
];

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const isToday =
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate();

  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const formatted = date.toLocaleDateString(undefined, options);
  return isToday ? `Today, ${formatted}` : formatted;
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export default function DiaryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedMeals, setCollapsedMeals] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [summaryRes, entriesRes] = await Promise.all([
        getDailySummary(currentDate),
        getDiaryEntries(currentDate),
      ]);
      setSummary(summaryRes);
      setEntries(entriesRes || []);
    } catch (e: any) {
      console.warn('Error loading diary data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate]);

  // Load when date changes
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Refresh when tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const toggleMealCollapse = (mealKey: string) => {
    setCollapsedMeals((prev) => ({
      ...prev,
      [mealKey]: !prev[mealKey],
    }));
  };

  const handleDeleteEntry = (entry: FoodEntry) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete ${entry.food_detail?.name || 'this entry'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFoodEntry(entry.id);
              loadData(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const navigateToAddFood = (mealKey: string) => {
    router.push({
      pathname: '/(tabs)/search',
      params: { meal: mealKey, date: currentDate },
    });
  };

  const caloriesEaten = summary?.totals?.calories ?? 0;
  const caloriesTarget = summary?.targets?.calories ?? 2000;
  const caloriesRemaining = summary?.remaining?.calories ?? (caloriesTarget - caloriesEaten);
  const calPercent = Math.min(Math.round((caloriesEaten / (caloriesTarget || 1)) * 100), 100);

  const proteinEaten = summary?.totals?.protein_g ?? 0;
  const proteinTarget = summary?.targets?.protein_g ?? 150;
  const proteinPercent = Math.min(Math.round((proteinEaten / (proteinTarget || 1)) * 100), 100);

  const carbsEaten = summary?.totals?.carbs_g ?? 0;
  const carbsTarget = summary?.targets?.carbs_g ?? 200;
  const carbsPercent = Math.min(Math.round((carbsEaten / (carbsTarget || 1)) * 100), 100);

  const fatEaten = summary?.totals?.fat_g ?? 0;
  const fatTarget = summary?.targets?.fat_g ?? 65;
  const fatPercent = Math.min(Math.round((fatEaten / (fatTarget || 1)) * 100), 100);

  const ringSize = 116;
  const strokeWidth = 8;
  const ringRadius = (ringSize - strokeWidth) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashoffset = ringCircumference - (Math.min(calPercent, 100) / 100) * ringCircumference;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Date Navigation Bar */}
      <View style={[styles.dateBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={() => setCurrentDate((d) => shiftDate(d, -1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateCenter}
          onPress={() => setCurrentDate(new Date().toISOString().split('T')[0])}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.dateText, { color: colors.text }]}>{formatDateDisplay(currentDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={() => setCurrentDate((d) => shiftDate(d, 1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {/* Macro Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryTopRow}>
              <View style={styles.calorieRingContainer}>
                <View style={styles.ringWrapper}>
                  <Svg width={ringSize} height={ringSize} style={styles.svgRing}>
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      stroke={colors.surfaceVariant}
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    <Circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      stroke={calPercent > 100 ? colors.warning : colors.calories}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={ringDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                    />
                  </Svg>
                  <View style={styles.ringCenterText}>
                    <Text style={[styles.calorieValue, { color: colors.text }]}>{Math.round(caloriesEaten)}</Text>
                    <Text style={styles.calorieSubtext}>of {Math.round(caloriesTarget)}</Text>
                    <Text style={styles.percentText}>{calPercent}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.calorieDetails}>
                <View style={styles.calorieStatRow}>
                  <Text style={[styles.calorieStatLabel, { color: colors.textSecondary }]}>Base Goal:</Text>
                  <Text style={[styles.calorieStatNumber, { color: colors.text }]}>{Math.round(caloriesTarget)} kcal</Text>
                </View>
                <View style={styles.calorieStatRow}>
                  <Text style={[styles.calorieStatLabel, { color: colors.textSecondary }]}>Food Eaten:</Text>
                  <Text style={[styles.calorieStatNumber, { color: colors.calories }]}>
                    {Math.round(caloriesEaten)} kcal
                  </Text>
                </View>
                <View style={[styles.calorieStatRow, styles.calorieRemainingRow]}>
                  <Text style={styles.calorieRemainingLabel}>Remaining:</Text>
                  <Text
                    style={[
                      styles.calorieRemainingNumber,
                      { color: caloriesRemaining < 0 ? colors.error : colors.primary },
                    ]}
                  >
                    {Math.round(caloriesRemaining)} kcal
                  </Text>
                </View>
              </View>
            </View>

            {/* Macro Bars */}
            <View style={styles.macroBarsContainer}>
              {/* Protein */}
              <View style={styles.macroCol}>
                <View style={styles.macroHeader}>
                  <Text style={[styles.macroName, { color: colors.textSecondary }]}>Protein</Text>
                  <Text style={[styles.macroAmount, { color: colors.protein }]}>
                    {Math.round(proteinEaten)} / {Math.round(proteinTarget)}g
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${proteinPercent}%`, backgroundColor: colors.protein },
                    ]}
                  />
                </View>
              </View>

              {/* Carbs */}
              <View style={styles.macroCol}>
                <View style={styles.macroHeader}>
                  <Text style={[styles.macroName, { color: colors.textSecondary }]}>Carbs</Text>
                  <Text style={[styles.macroAmount, { color: colors.carbs }]}>
                    {Math.round(carbsEaten)} / {Math.round(carbsTarget)}g
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${carbsPercent}%`, backgroundColor: colors.carbs },
                    ]}
                  />
                </View>
              </View>

              {/* Fat */}
              <View style={styles.macroCol}>
                <View style={styles.macroHeader}>
                  <Text style={[styles.macroName, { color: colors.textSecondary }]}>Fat</Text>
                  <Text style={[styles.macroAmount, { color: colors.fat }]}>
                    {Math.round(fatEaten)} / {Math.round(fatTarget)}g
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${fatPercent}%`, backgroundColor: colors.fat },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Meals Sections */}
          {MEALS.map((meal) => {
            const mealEntries = entries.filter((e) => e.meal.toLowerCase() === meal.key);
            const mealCalories = mealEntries.reduce((sum, item) => sum + item.calories, 0);
            const isCollapsed = !!collapsedMeals[meal.key];

            return (
              <View key={meal.key} style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Header */}
                <TouchableOpacity
                  style={styles.mealHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleMealCollapse(meal.key)}
                >
                  <View style={styles.mealHeaderLeft}>
                    <Ionicons
                      name={meal.icon as any}
                      size={20}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.mealTitle, { color: colors.text }]}>{meal.label}</Text>
                  </View>
                  <View style={styles.mealHeaderRight}>
                    <Text style={styles.mealCalsText}>{Math.round(mealCalories)} kcal</Text>
                    <Ionicons
                      name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                      size={18}
                      color={colors.textSecondary}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Body when expanded */}
                {!isCollapsed && (
                  <View style={styles.mealBody}>
                    {mealEntries.length === 0 ? (
                      <Text style={styles.emptyMealText}>No foods logged for {meal.label.toLowerCase()}</Text>
                    ) : (
                      mealEntries.map((entry) => (
                        <View key={entry.id} style={styles.foodRow}>
                          <View style={styles.foodInfo}>
                            <Text style={styles.foodName} numberOfLines={1}>
                              {entry.food_detail?.name || 'Food Item'}
                            </Text>
                            <Text style={styles.foodSubtext}>
                              P: {Math.round(entry.protein)}g | C: {Math.round(entry.carbs)}g | F: {Math.round(entry.fat)}g
                            </Text>
                          </View>
                          <View style={styles.foodActions}>
                            <Text style={styles.foodCalories}>{Math.round(entry.calories)} kcal</Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteEntry(entry)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.deleteButton}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Add Food Button */}
                    <TouchableOpacity
                      style={styles.addFoodButton}
                      onPress={() => navigateToAddFood(meal.key)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.addFoodText}>Add Food</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateNavButton: {
    padding: 6,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieRingContainer: {
    marginRight: 16,
  },
  ringWrapper: {
    width: 116,
    height: 116,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ringCenterText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  calorieSubtext: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.calories,
    marginTop: 2,
  },
  calorieDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  calorieStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calorieStatLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  calorieStatNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  calorieRemainingRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  calorieRemainingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  calorieRemainingNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  macroBarsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    gap: 10,
  },
  macroCol: {
    width: '100%',
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  macroAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 7,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealCalsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.calories,
  },
  mealBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyMealText: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  foodInfo: {
    flex: 1,
    paddingRight: 8,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  foodSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodCalories: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 10,
  },
  deleteButton: {
    padding: 4,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
  },
  addFoodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
});
