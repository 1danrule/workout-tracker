import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getCalorieHistory, getWeightHistory, logWeight } from '../../services/api';
import type { CalorieDay, CalorieHistoryResponse, WeightLog } from '../../types';

type SectionTab = 'calories' | 'weight';
type PeriodOption = 7 | 30;

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<SectionTab>('calories');
  const [period, setPeriod] = useState<PeriodOption>(7);

  // Calorie History State
  const [calorieData, setCalorieData] = useState<CalorieHistoryResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalorieDay | null>(null);

  // Weight History State
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loggingWeight, setLoggingWeight] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [calRes, weightRes] = await Promise.all([
        getCalorieHistory(period),
        getWeightHistory(period),
      ]);
      setCalorieData(calRes);
      setWeightLogs(Array.isArray(weightRes) ? weightRes : weightRes.results || []);

      // Default select the last day in calorie graph
      if (calRes?.history?.length) {
        setSelectedDay(calRes.history[calRes.history.length - 1]);
      }
    } catch (e: any) {
      console.warn('Error loading progress data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleSaveWeight = async () => {
    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val < 30 || val > 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight between 30 and 300 kg.');
      return;
    }

    setLoggingWeight(true);
    try {
      await logWeight(val, newWeightDate);
      setShowWeightModal(false);
      setNewWeightInput('');
      loadData(false);
      Alert.alert('Success', `Weight of ${val} kg recorded for ${newWeightDate}!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not log weight.');
    } finally {
      setLoggingWeight(false);
    }
  };

  // Calculations for Calorie Chart
  const daysHistory = calorieData?.history || [];
  const targetCalories = calorieData?.target_calories || 2000;
  const maxCaloriesInHistory = Math.max(
    targetCalories,
    ...daysHistory.map((d) => d.calories),
    1000
  );

  const totalCaloriesPeriod = daysHistory.reduce((sum, d) => sum + d.calories, 0);
  const avgCaloriesPeriod = daysHistory.length
    ? Math.round(totalCaloriesPeriod / daysHistory.length)
    : 0;

  const totalProteinPeriod = daysHistory.reduce((sum, d) => sum + d.protein_g, 0);
  const avgProteinPeriod = daysHistory.length
    ? (totalProteinPeriod / daysHistory.length).toFixed(1)
    : '0';

  // Calculations for Weight Chart
  const sortedWeights = [...weightLogs].sort((a, b) => (a.date > b.date ? 1 : -1));
  const latestWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weight_kg : null;
  const initialWeight = sortedWeights.length > 0 ? sortedWeights[0].weight_kg : null;
  const weightChange = latestWeight !== null && initialWeight !== null ? (latestWeight - initialWeight).toFixed(1) : null;

  const minWeight = sortedWeights.length > 0 ? Math.min(...sortedWeights.map((w) => w.weight_kg)) : 60;
  const maxWeight = sortedWeights.length > 0 ? Math.max(...sortedWeights.map((w) => w.weight_kg)) : 90;
  const weightRange = Math.max(maxWeight - minWeight, 2);

  return (
    <View style={styles.container}>
      {/* Top Header Tabs */}
      <View style={styles.header}>
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'calories' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('calories')}
          >
            <Ionicons
              name="flame"
              size={18}
              color={activeTab === 'calories' ? Colors.white : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === 'calories' && styles.toggleBtnTextActive,
              ]}
            >
              Calories & Macros
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'weight' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('weight')}
          >
            <Ionicons
              name="scale"
              size={18}
              color={activeTab === 'weight' ? Colors.white : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === 'weight' && styles.toggleBtnTextActive,
              ]}
            >
              Weight Progress
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector (7d vs 30d) */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodChip, period === 7 && styles.periodChipActive]}
            onPress={() => setPeriod(7)}
          >
            <Text style={[styles.periodText, period === 7 && styles.periodTextActive]}>
              Last 7 Days
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodChip, period === 30 && styles.periodChipActive]}
            onPress={() => setPeriod(30)}
          >
            <Text style={[styles.periodText, period === 30 && styles.periodTextActive]}>
              Last 30 Days
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {activeTab === 'calories' ? (
            /* ================= CALORIES TAB ================= */
            <View>
              {/* Summary Highlights */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Avg Intake</Text>
                  <Text style={[styles.statValue, { color: Colors.calories }]}>
                    {avgCaloriesPeriod} <Text style={styles.statUnit}>kcal</Text>
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Daily Target</Text>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>
                    {targetCalories} <Text style={styles.statUnit}>kcal</Text>
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Avg Protein</Text>
                  <Text style={[styles.statValue, { color: Colors.protein }]}>
                    {avgProteinPeriod} <Text style={styles.statUnit}>g</Text>
                  </Text>
                </View>
              </View>

              {/* Bar Chart Card */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Daily Calories</Text>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.calories }]} />
                    <Text style={styles.legendText}>Intake</Text>
                    <View style={[styles.legendLine, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.legendText}>Target ({targetCalories})</Text>
                  </View>
                </View>

                {/* Bars Container */}
                <View style={styles.barsArea}>
                  {/* Target reference line */}
                  <View
                    style={[
                      styles.targetLine,
                      {
                        bottom: `${Math.min((targetCalories / maxCaloriesInHistory) * 100, 95)}%`,
                      },
                    ]}
                  />

                  {daysHistory.map((item, idx) => {
                    const heightPercent = Math.min((item.calories / maxCaloriesInHistory) * 100, 100);
                    const isSelected = selectedDay?.date === item.date;
                    const isOverTarget = item.calories > targetCalories;
                    const dateObj = new Date(item.date + 'T00:00:00');
                    const dayLabel = period === 7
                      ? dateObj.toLocaleDateString(undefined, { weekday: 'narrow' })
                      : `${dateObj.getDate()}`;

                    return (
                      <TouchableOpacity
                        key={item.date}
                        style={styles.barColumn}
                        onPress={() => setSelectedDay(item)}
                      >
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(heightPercent, 4)}%`,
                                backgroundColor: isSelected
                                  ? Colors.primary
                                  : isOverTarget
                                  ? Colors.warning
                                  : Colors.calories,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.barDateLabel, isSelected && styles.barDateLabelSelected]}>
                          {dayLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day Details Card */}
                {selectedDay && (
                  <View style={styles.selectedDayBox}>
                    <View style={styles.selectedDayHeader}>
                      <Text style={styles.selectedDayTitle}>
                        {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.selectedDayCalories}>
                        {Math.round(selectedDay.calories)} kcal
                      </Text>
                    </View>

                    <View style={styles.macroPillsRow}>
                      <View style={[styles.macroPill, { backgroundColor: Colors.proteinLight }]}>
                        <Text style={[styles.macroPillText, { color: Colors.protein }]}>
                          Protein: {selectedDay.protein_g}g
                        </Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: Colors.carbsLight }]}>
                        <Text style={[styles.macroPillText, { color: Colors.carbsDark }]}>
                          Carbs: {selectedDay.carbs_g}g
                        </Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: Colors.fatLight }]}>
                        <Text style={[styles.macroPillText, { color: Colors.fatDark }]}>
                          Fat: {selectedDay.fat_g}g
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* ================= WEIGHT TAB ================= */
            <View>
              {/* Weight Highlights Card */}
              <View style={styles.weightSummaryCard}>
                <View style={styles.weightSummaryLeft}>
                  <Text style={styles.weightSummaryLabel}>Latest Weight</Text>
                  <Text style={styles.weightSummaryValue}>
                    {latestWeight !== null ? `${latestWeight} kg` : 'No logs yet'}
                  </Text>
                </View>

                {weightChange !== null && (
                  <View style={styles.weightChangeBadge}>
                    <Ionicons
                      name={parseFloat(weightChange) <= 0 ? 'arrow-down' : 'arrow-up'}
                      size={18}
                      color={parseFloat(weightChange) <= 0 ? Colors.success : Colors.warning}
                    />
                    <Text
                      style={[
                        styles.weightChangeText,
                        {
                          color: parseFloat(weightChange) <= 0 ? Colors.success : Colors.warning,
                        },
                      ]}
                    >
                      {Math.abs(parseFloat(weightChange))} kg
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.logWeightBtn}
                  onPress={() => {
                    setNewWeightInput(latestWeight ? String(latestWeight) : '70');
                    setShowWeightModal(true);
                  }}
                >
                  <Ionicons name="add" size={20} color={Colors.white} />
                  <Text style={styles.logWeightBtnText}>Log Weight</Text>
                </TouchableOpacity>
              </View>

              {/* Weight Points / Chart View */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Weight Trend</Text>

                {sortedWeights.length === 0 ? (
                  <View style={styles.emptyWeightBox}>
                    <Ionicons name="scale-outline" size={48} color={Colors.textLight} />
                    <Text style={styles.emptyWeightText}>
                      No weight logs for this period.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyActionBtn}
                      onPress={() => setShowWeightModal(true)}
                    >
                      <Text style={styles.emptyActionBtnText}>Log Today's Weight</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.weightGraphContainer}>
                    <View style={styles.weightGraphArea}>
                      {sortedWeights.map((w, index) => {
                        const relativeHeight = Math.max(
                          0.1,
                          Math.min(1, (w.weight_kg - minWeight) / weightRange)
                        );
                        return (
                          <View key={w.id || w.date} style={styles.weightPointColumn}>
                            <View
                              style={[
                                styles.weightPointDot,
                                {
                                  bottom: `${relativeHeight * 80 + 10}%`,
                                },
                              ]}
                            >
                              <Text style={styles.pointValueText}>{w.weight_kg}</Text>
                            </View>
                            <Text style={styles.weightDateLabel}>
                              {w.date.slice(5)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Recent History Table */}
              {sortedWeights.length > 0 && (
                <View style={styles.historyListCard}>
                  <Text style={styles.historyTitle}>Log Entries</Text>
                  {sortedWeights
                    .slice()
                    .reverse()
                    .map((item) => (
                      <View key={item.id || item.date} style={styles.historyRow}>
                        <View style={styles.historyDateCol}>
                          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                          <Text style={styles.historyDateText}>{item.date}</Text>
                        </View>
                        <Text style={styles.historyWeightText}>{item.weight_kg} kg</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL: LOG WEIGHT */}
      <Modal
        visible={showWeightModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Weight</Text>
              <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Weight (kg) *</Text>
              <TextInput
                style={styles.modalInput}
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                keyboardType="numeric"
                placeholder="75.5"
                placeholderTextColor={Colors.textLight}
                autoFocus
              />

              <Text style={styles.modalLabel}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.modalInput}
                value={newWeightDate}
                onChangeText={setNewWeightDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textLight}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, loggingWeight && styles.btnDisabled]}
                onPress={handleSaveWeight}
                disabled={loggingWeight}
              >
                {loggingWeight ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Entry</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: Colors.white,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
  },
  periodChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.primaryDark,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 14,
    height: 2,
    marginLeft: 6,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  barsArea: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 4,
    position: 'relative',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.primary,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: '85%',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  barDateLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedDayBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  selectedDayCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.calories,
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  macroPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weightSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  weightSummaryLeft: {
    flex: 1,
  },
  weightSummaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  weightSummaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  weightChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
    gap: 4,
  },
  weightChangeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logWeightBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  logWeightBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWeightBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyWeightText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyActionBtn: {
    marginTop: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: Colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },
  weightGraphContainer: {
    marginTop: 16,
  },
  weightGraphArea: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  weightPointColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  weightPointDot: {
    position: 'absolute',
    alignItems: 'center',
  },
  pointValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  weightDateLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  historyListCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyDateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    fontSize: 14,
    color: Colors.text,
  },
  historyWeightText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalBody: {
    gap: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  modalInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
