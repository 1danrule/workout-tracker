import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getWorkouts,
  createWorkout,
  getWorkoutDetail,
  deleteWorkout,
  getExercises,
  addWorkoutSet,
  deleteWorkoutSet,
} from '../../services/api';
import type { Workout, WorkoutSet, Exercise } from '../../types';

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Expanded workout in history list
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<number | null>(null);

  // Start New Workout Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutNotes, setNewWorkoutNotes] = useState('');
  const [creatingWorkout, setCreatingWorkout] = useState(false);

  // Active Workout State (full screen session)
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  // Exercise Picker Modal
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Add Set Modal
  const [selectedExerciseForSet, setSelectedExerciseForSet] = useState<Exercise | null>(null);
  const [repsInput, setRepsInput] = useState('10');
  const [weightInput, setWeightInput] = useState('60');
  const [savingSet, setSavingSet] = useState(false);

  // Load workouts & exercises
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [workoutsData, exercisesData] = await Promise.all([
        getWorkouts(),
        getExercises(),
      ]);
      const list = Array.isArray(workoutsData) ? workoutsData : (workoutsData as any).results || [];
      const exList = Array.isArray(exercisesData) ? exercisesData : (exercisesData as any).results || [];
      // Sort workouts descending by date
      setWorkouts(list.sort((a: Workout, b: Workout) => (b.date > a.date ? 1 : -1)));
      setExercises(exList);
    } catch (e: any) {
      console.warn('Error loading workouts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const handleCreateWorkout = async () => {
    if (!newWorkoutName.trim()) {
      Alert.alert('Required', 'Please enter a name for your workout');
      return;
    }

    setCreatingWorkout(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const created = await createWorkout({
        name: newWorkoutName.trim(),
        date: today,
        notes: newWorkoutNotes.trim(),
      });

      setShowStartModal(false);
      setNewWorkoutName('');
      setNewWorkoutNotes('');
      setActiveWorkout(created);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create workout');
    } finally {
      setCreatingWorkout(false);
    }
  };

  const handleFinishWorkout = () => {
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to complete this workout session?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Finish',
          style: 'default',
          onPress: () => {
            setActiveWorkout(null);
            loadData(false);
            Alert.alert('Workout Completed! 💪', 'Awesome work today!');
          },
        },
      ]
    );
  };

  const handleDeleteWorkout = (id: number, name: string) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkout(id);
              if (expandedWorkoutId === id) setExpandedWorkoutId(null);
              loadData(false);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete workout');
            }
          },
        },
      ]
    );
  };

  const handleOpenAddSet = (exercise: Exercise) => {
    setSelectedExerciseForSet(exercise);
    // Find previous set for this exercise to pre-populate sensible values
    const existingSets = activeWorkout?.sets?.filter((s) => s.exercise === exercise.id) || [];
    if (existingSets.length > 0) {
      const lastSet = existingSets[existingSets.length - 1];
      setRepsInput(String(lastSet.reps));
      setWeightInput(String(lastSet.weight_kg));
    } else {
      setRepsInput('10');
      setWeightInput('60');
    }
  };

  const handleSaveSet = async () => {
    if (!activeWorkout || !selectedExerciseForSet) return;
    const reps = parseInt(repsInput, 10);
    const weight = parseFloat(weightInput);

    if (isNaN(reps) || reps <= 0) {
      Alert.alert('Invalid Reps', 'Please enter a valid rep count (> 0)');
      return;
    }
    if (isNaN(weight) || weight < 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    setSavingSet(true);
    try {
      const existingSetsForExercise =
        activeWorkout.sets?.filter((s) => s.exercise === selectedExerciseForSet.id) || [];
      const setNumber = existingSetsForExercise.length + 1;

      await addWorkoutSet(activeWorkout.id, {
        exercise: selectedExerciseForSet.id,
        set_number: setNumber,
        reps,
        weight_kg: weight,
      });

      // Reload active workout detail to get updated sets list
      const updated = await getWorkoutDetail(activeWorkout.id);
      setActiveWorkout(updated);
      setSelectedExerciseForSet(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save set');
    } finally {
      setSavingSet(false);
    }
  };

  const handleDeleteSet = async (setId: number) => {
    if (!activeWorkout) return;
    try {
      await deleteWorkoutSet(activeWorkout.id, setId);
      const updated = await getWorkoutDetail(activeWorkout.id);
      setActiveWorkout(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not remove set');
    }
  };

  // Group active workout sets by exercise
  const groupedActiveSets = React.useMemo(() => {
    if (!activeWorkout?.sets) return [];
    const map = new Map<number, { exerciseId: number; name: string; sets: WorkoutSet[] }>();
    for (const s of activeWorkout.sets) {
      if (!map.has(s.exercise)) {
        map.set(s.exercise, { exerciseId: s.exercise, name: s.exercise_name, sets: [] });
      }
      map.get(s.exercise)!.sets.push(s);
    }
    return Array.from(map.values());
  }, [activeWorkout?.sets]);

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    ex.muscle_group.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.startWorkoutButton}
          onPress={() => setShowStartModal(true)}
        >
          <Ionicons name="flash" size={20} color={Colors.white} />
          <Text style={styles.startWorkoutText}>Start New Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Workouts History List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => `workout-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          renderItem={({ item }) => {
            const isExpanded = expandedWorkoutId === item.id;
            const setCount = item.sets?.length || 0;

            // Group sets for display in expanded view
            const grouped = new Map<string, WorkoutSet[]>();
            if (item.sets) {
              for (const s of item.sets) {
                const exName = s.exercise_name || `Exercise #${s.exercise}`;
                if (!grouped.has(exName)) grouped.set(exName, []);
                grouped.get(exName)!.push(s);
              }
            }

            return (
              <View style={styles.workoutCard}>
                <TouchableOpacity
                  style={styles.workoutHeader}
                  activeOpacity={0.7}
                  onPress={() => setExpandedWorkoutId(isExpanded ? null : item.id)}
                >
                  <View style={styles.workoutHeaderLeft}>
                    <Text style={[styles.workoutName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={styles.workoutDate}>
                      {item.date} • {setCount} {setCount === 1 ? 'set' : 'sets'}
                    </Text>
                    {!!item.notes && <Text style={styles.workoutNotes}>{item.notes}</Text>}
                  </View>

                  <View style={styles.workoutHeaderRight}>
                    <TouchableOpacity
                      onPress={() => handleDeleteWorkout(item.id, item.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.deleteWorkoutBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.textSecondary}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Sets Details */}
                {isExpanded && (
                  <View style={styles.workoutExpandedBody}>
                    {setCount === 0 ? (
                      <Text style={styles.emptySetsText}>No sets recorded for this workout.</Text>
                    ) : (
                      Array.from(grouped.entries()).map(([exName, sList]) => (
                        <View key={exName} style={styles.exerciseGroup}>
                          <Text style={styles.exerciseGroupTitle}>{exName}</Text>
                          {sList.map((s, idx) => (
                            <View key={s.id || idx} style={styles.setRow}>
                              <Text style={styles.setNumber}>Set {s.set_number || idx + 1}</Text>
                              <Text style={styles.setDetails}>
                                {s.reps} reps × {s.weight_kg} kg
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={54} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No Workouts Yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Start New Workout" above to begin your first training session!
              </Text>
            </View>
          }
        />
      )}

      {/* START WORKOUT MODAL */}
      <Modal
        visible={showStartModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStartModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Workout Session</Text>
              <TouchableOpacity
                onPress={() => setShowStartModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Workout Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Chest & Triceps, Leg Day"
                placeholderTextColor={Colors.textLight}
                value={newWorkoutName}
                onChangeText={setNewWorkoutName}
                autoFocus
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="e.g. Focused on progressive overload"
                placeholderTextColor={Colors.textLight}
                value={newWorkoutNotes}
                onChangeText={setNewWorkoutNotes}
                multiline
              />

              <TouchableOpacity
                style={[styles.primaryButton, creatingWorkout && styles.buttonDisabled]}
                onPress={handleCreateWorkout}
                disabled={creatingWorkout}
              >
                {creatingWorkout ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Start Workout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ACTIVE WORKOUT SESSION MODAL */}
      <Modal
        visible={activeWorkout !== null}
        animationType="slide"
        onRequestClose={handleFinishWorkout}
      >
        <View style={styles.activeContainer}>
          {/* Active Workout Header */}
          <View style={styles.activeHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>ACTIVE SESSION</Text>
              </View>
              <Text style={styles.activeWorkoutTitle}>{activeWorkout?.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.finishWorkoutButton}
              onPress={handleFinishWorkout}
            >
              <Text style={styles.finishWorkoutText}>Finish</Text>
            </TouchableOpacity>
          </View>

          {/* Active Workout Content */}
          <ScrollView contentContainerStyle={styles.activeScrollContent}>
            {groupedActiveSets.length === 0 ? (
              <View style={styles.activeEmptyState}>
                <Ionicons name="fitness-outline" size={54} color={Colors.textLight} />
                <Text style={styles.activeEmptyTitle}>No Exercises Added</Text>
                <Text style={styles.activeEmptySubtitle}>
                  Add exercises from the library below to start recording your sets.
                </Text>
              </View>
            ) : (
              groupedActiveSets.map((group) => {
                const exObj = exercises.find((e) => e.id === group.exerciseId) || {
                  id: group.exerciseId,
                  name: group.name,
                  muscle_group: '',
                  description: '',
                };

                return (
                  <View key={group.exerciseId} style={styles.activeExerciseCard}>
                    <View style={styles.activeExerciseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activeExerciseTitle}>{group.name}</Text>
                        {!!exObj.muscle_group && (
                          <Text style={styles.activeExerciseMuscle}>
                            {exObj.muscle_group.toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.addSetMiniButton}
                        onPress={() => handleOpenAddSet(exObj)}
                      >
                        <Ionicons name="add" size={16} color={Colors.primary} />
                        <Text style={styles.addSetMiniText}>Add Set</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Sets Table */}
                    <View style={styles.setsTable}>
                      <View style={styles.setsTableHeader}>
                        <Text style={[styles.setsTableHeadCol, { width: 44 }]}>SET</Text>
                        <Text style={[styles.setsTableHeadCol, { flex: 1 }]}>WEIGHT (KG)</Text>
                        <Text style={[styles.setsTableHeadCol, { flex: 1 }]}>REPS</Text>
                        <Text style={[styles.setsTableHeadCol, { width: 34 }]}></Text>
                      </View>

                      {group.sets.map((set, idx) => (
                        <View key={set.id || idx} style={styles.setsTableRow}>
                          <Text style={[styles.setsTableColText, { width: 44, fontWeight: '700' }]}>
                            {set.set_number || idx + 1}
                          </Text>
                          <Text style={[styles.setsTableColText, { flex: 1 }]}>
                            {set.weight_kg} kg
                          </Text>
                          <Text style={[styles.setsTableColText, { flex: 1 }]}>
                            {set.reps}
                          </Text>
                          <TouchableOpacity
                            style={{ width: 34, alignItems: 'center' }}
                            onPress={() => handleDeleteSet(set.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}

            {/* Button to pick another exercise */}
            <TouchableOpacity
              style={styles.chooseExerciseButton}
              onPress={() => setShowExercisePicker(true)}
            >
              <Ionicons name="add-circle" size={22} color={Colors.primary} />
              <Text style={styles.chooseExerciseText}>+ Add Exercise from Library</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* EXERCISE PICKER MODAL */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Exercise Library</Text>
            <TouchableOpacity
              onPress={() => setShowExercisePicker(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearchBar}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by name or muscle group..."
              placeholderTextColor={Colors.textLight}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => `exercise-${item.id}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exercisePickerItem}
                onPress={() => {
                  setShowExercisePicker(false);
                  handleOpenAddSet(item);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.exercisePickerName}>{item.name}</Text>
                  <Text style={styles.exercisePickerMuscle}>{item.muscle_group}</Text>
                  {!!item.description && (
                    <Text style={styles.exercisePickerDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptySubtitle}>No exercises matched your search.</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* ADD SET MODAL */}
      <Modal
        visible={selectedExerciseForSet !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedExerciseForSet(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedExerciseForSet?.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedExerciseForSet?.muscle_group.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedExerciseForSet(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.setInputsRow}>
                <View style={styles.setInputCol}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.setNumericInput}
                    keyboardType="numeric"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    selectTextOnFocus
                  />
                </View>

                <View style={styles.setInputCol}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    style={styles.setNumericInput}
                    keyboardType="numeric"
                    value={repsInput}
                    onChangeText={setRepsInput}
                    selectTextOnFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, savingSet && styles.buttonDisabled]}
                onPress={handleSaveSet}
                disabled={savingSet}
              >
                {savingSet ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Record Set</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  startWorkoutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  workoutHeaderLeft: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  workoutDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  workoutNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  workoutHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteWorkoutBtn: {
    padding: 4,
  },
  workoutExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  emptySetsText: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  exerciseGroup: {
    marginBottom: 12,
  },
  exerciseGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    marginBottom: 4,
  },
  setNumber: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  setDetails: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
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
    paddingBottom: 24,
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
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // Active session
  activeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  activeHeader: {
    backgroundColor: Colors.surface,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  activeWorkoutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  finishWorkoutButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  finishWorkoutText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  activeScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeEmptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  activeEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  activeEmptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  activeExerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activeExerciseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  activeExerciseMuscle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  addSetMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addSetMiniText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  setsTable: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    overflow: 'hidden',
  },
  setsTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#EBEBEB',
  },
  setsTableHeadCol: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  setsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  setsTableColText: {
    fontSize: 14,
    color: Colors.text,
  },
  chooseExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  chooseExerciseText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Exercise picker
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  exercisePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exercisePickerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  exercisePickerMuscle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  exercisePickerDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // Set modal
  setInputsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  setInputCol: {
    flex: 1,
  },
  setNumericInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
