import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { searchFoods, searchOFF, searchOFFBarcode, createFood, deleteFood, addFoodEntry } from '../../services/api';
import type { Food, OFFSearchResult } from '../../types';

type TabType = 'my_foods' | 'off';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_OPTIONS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();

  const [activeTab, setActiveTab] = useState<TabType>('my_foods');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Results
  const [myFoods, setMyFoods] = useState<Food[]>([]);
  const [offFoods, setOffFoods] = useState<OFFSearchResult[]>([]);

  // Add to Diary modal state
  const [selectedFood, setSelectedFood] = useState<{
    id?: number;
    name: string;
    brand: string;
    barcode?: string;
    calories_per_100g: number;
    protein_per_100g: number;
    fat_per_100g: number;
    carbs_per_100g: number;
    isOFF?: boolean;
  } | null>(null);

  const [gramsInput, setGramsInput] = useState('100');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    (params.meal as MealType) || 'breakfast'
  );
  const [entryDate, setEntryDate] = useState<string>(
    params.date || new Date().toISOString().split('T')[0]
  );
  const [addingToDiary, setAddingToDiary] = useState(false);

  // Create Custom Food modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [creatingFood, setCreatingFood] = useState(false);

  // Barcode Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const isScanningRef = useRef(false);

  // Update pre-filled params if navigated here with new params
  useEffect(() => {
    if (params.meal) {
      setSelectedMeal(params.meal as MealType);
    }
    if (params.date) {
      setEntryDate(params.date);
    }
  }, [params.meal, params.date]);

  const performSearch = useCallback(async (query: string, tab: TabType) => {
    setLoading(true);
    try {
      if (tab === 'my_foods') {
        const res = await searchFoods(query);
        const list = Array.isArray(res) ? res : res.results || [];
        setMyFoods(list);
      } else {
        if (!query.trim()) {
          setOffFoods([]);
          setLoading(false);
          return;
        }
        const res = await searchOFF(query);
        setOffFoods(res.results || []);
      }
    } catch (e: any) {
      Alert.alert('Search Error', e.message || 'Failed to search foods');
    } finally {
      setLoading(false);
    }
  }, []);

  // Live search with 300ms debounce for My Foods, or instant load on tab switch
  useEffect(() => {
    if (activeTab === 'my_foods') {
      const timer = setTimeout(() => {
        performSearch(searchQuery, 'my_foods');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, performSearch]);

  const handleSearchSubmit = () => {
    performSearch(searchQuery, activeTab);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Camera access is required to scan food barcodes. Please enable camera access in your phone settings."
        );
        return;
      }
    }
    isScanningRef.current = false;
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Instant synchronous gatekeeper: prevents camera frame spam (30-60 fps)
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setScanned(true);

    // Guard: ignore promotional QR URLs (e.g. https://qr.kinder.com/...)
    if (data.startsWith('http://') || data.startsWith('https://')) {
      setShowScanner(false);
      Alert.alert(
        'Promo Link Detected',
        'You scanned a promotional QR link, not a product barcode. Please point the camera at the striped barcode (EAN / UPC) on the package.',
        [
          {
            text: 'Scan Barcode',
            onPress: () => {
              isScanningRef.current = false;
              setScanned(false);
              setShowScanner(true);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              isScanningRef.current = false;
              setScanned(false);
            },
          },
        ]
      );
      return;
    }

    // Immediately close camera view so it does not keep scanning or go black
    setShowScanner(false);
    setLoading(true);

    try {
      const product = await searchOFFBarcode(data);
      handleSelectFood(product, true);
    } catch (err: any) {
      Alert.alert(
        "Product Not Found",
        `No product found for barcode ${data}. Would you like to create a custom food with this barcode?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              isScanningRef.current = false;
              setScanned(false);
            },
          },
          {
            text: "Create Food",
            onPress: () => {
              setCustomBarcode(data);
              setShowCreateModal(true);
              isScanningRef.current = false;
              setScanned(false);
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFood = (food: Food | OFFSearchResult, isOFF: boolean) => {
    setSelectedFood({
      id: 'id' in food ? food.id : undefined,
      name: food.name,
      brand: food.brand || '',
      barcode: food.barcode || '',
      calories_per_100g: Number(food.calories_per_100g) || 0,
      protein_per_100g: Number(food.protein_per_100g) || 0,
      fat_per_100g: Number(food.fat_per_100g) || 0,
      carbs_per_100g: Number(food.carbs_per_100g) || 0,
      isOFF,
    });
    setGramsInput('100');
  };

  const handleConfirmAddToDiary = async () => {
    if (!selectedFood) return;
    const grams = parseFloat(gramsInput);
    if (isNaN(grams) || grams <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid weight in grams (> 0)');
      return;
    }

    setAddingToDiary(true);
    try {
      let foodId = selectedFood.id;

      // If food is from OpenFoodFacts or has no ID in database, persist it first
      if (!foodId) {
        const hasNutrients =
          selectedFood.calories_per_100g > 0 ||
          selectedFood.protein_per_100g > 0 ||
          selectedFood.fat_per_100g > 0 ||
          selectedFood.carbs_per_100g > 0;

        const created = await createFood({
          name: selectedFood.name,
          brand: selectedFood.brand,
          barcode: hasNutrients && selectedFood.barcode ? selectedFood.barcode : undefined,
          calories_per_100g: selectedFood.calories_per_100g,
          protein_per_100g: selectedFood.protein_per_100g,
          fat_per_100g: selectedFood.fat_per_100g,
          carbs_per_100g: selectedFood.carbs_per_100g,
        });
        foodId = created.id;
      }

      await addFoodEntry({
        food: foodId!,
        grams,
        date: entryDate,
        meal: selectedMeal,
      });

      // Close the modal and stay on this screen (no confirmation dialog, no navigation)
      setSelectedFood(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add food to diary');
    } finally {
      setAddingToDiary(false);
    }
  };

  const handleDeleteFood = (food: Food) => {
    Alert.alert('Delete food', `Delete "${food.name}" from My Foods?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFood(food.id);
            setMyFoods((prev) => prev.filter((f) => f.id !== food.id));
          } catch (e: any) {
            Alert.alert('Cannot delete', e.message || 'Failed to delete food');
          }
        },
      },
    ]);
  };

  // Open Food Facts sometimes has no nutrition facts for a product (all zeros).
  // Let the user enter the values by hand, prefilled with the scanned product.
  const handleEnterManually = () => {
    if (!selectedFood) return;
    setCustomName(selectedFood.name);
    setCustomBrand(selectedFood.brand);
    setCustomBarcode(selectedFood.barcode || '');
    setSelectedFood(null);
    // Small delay so the first modal is fully dismissed before the second opens (iOS)
    setTimeout(() => setShowCreateModal(true), 350);
  };

  const handleCreateCustomFood = async () => {
    if (!customName.trim()) {
      Alert.alert('Missing Name', 'Please provide a food name');
      return;
    }

    const cals = parseFloat(customCalories);
    const prot = parseFloat(customProtein);
    const fat = parseFloat(customFat);
    const carbs = parseFloat(customCarbs);

    if (isNaN(cals) || isNaN(prot) || isNaN(fat) || isNaN(carbs)) {
      Alert.alert('Invalid Values', 'Please enter valid numbers for calories and macros');
      return;
    }

    setCreatingFood(true);
    try {
      const created = await createFood({
        name: customName.trim(),
        brand: customBrand.trim(),
        barcode: customBarcode.trim() || undefined,
        calories_per_100g: cals,
        protein_per_100g: prot,
        fat_per_100g: fat,
        carbs_per_100g: carbs,
      });

      setShowCreateModal(false);
      setCustomName('');
      setCustomBrand('');
      setCustomBarcode('');
      setCustomCalories('');
      setCustomProtein('');
      setCustomFat('');
      setCustomCarbs('');

      // Refresh list
      performSearch(searchQuery, 'my_foods');
      setActiveTab('my_foods');

      // Prompt to add directly to diary
      handleSelectFood(created, false);
    } catch (e: any) {
      Alert.alert('Creation Failed', e.message || 'Could not create custom food');
    } finally {
      setCreatingFood(false);
    }
  };

  // Calculations for Add to Diary Modal
  const gramsNum = parseFloat(gramsInput) || 0;
  const factor = gramsNum / 100;
  const calcCals = selectedFood ? Math.round(selectedFood.calories_per_100g * factor) : 0;
  const calcProt = selectedFood ? (selectedFood.protein_per_100g * factor).toFixed(1) : '0';
  const calcCarbs = selectedFood ? (selectedFood.carbs_per_100g * factor).toFixed(1) : '0';
  const calcFat = selectedFood ? (selectedFood.fat_per_100g * factor).toFixed(1) : '0';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={activeTab === 'my_foods' ? 'Search your foods...' : 'Search Open Food Facts...'}
            placeholderTextColor={colors.textLight}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitButton}>
              <Text style={styles.searchSubmitText}>Search</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleOpenScanner} style={styles.scanIconButton}>
              <Ionicons name="barcode-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'my_foods' && styles.tabButtonActive]}
            onPress={() => setActiveTab('my_foods')}
          >
            <Text style={[styles.tabText, activeTab === 'my_foods' && styles.tabTextActive]}>
              My Foods
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'off' && styles.tabButtonActive]}
            onPress={() => setActiveTab('off')}
          >
            <Text style={[styles.tabText, activeTab === 'off' && styles.tabTextActive]}>
              Open Food Facts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Bar: Scan Barcode & Create Custom Food */}
      <View style={[styles.actionBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenScanner}
        >
          <Ionicons name="scan-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Scan Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Create Food</Text>
        </TouchableOpacity>
      </View>

      {/* Results List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'my_foods' ? (
        <FlatList
          data={myFoods}
          keyExtractor={(item) => `food-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.foodItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSelectFood(item, false)}
            >
              <View style={styles.foodItemInfo}>
                <Text style={[styles.foodItemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={styles.foodItemBrand}>
                  {item.brand ? `${item.brand} • ` : ''}100g
                </Text>
                <Text style={styles.foodItemMacros}>
                  P: {Math.round(item.protein_per_100g)}g | C: {Math.round(item.carbs_per_100g)}g | F: {Math.round(item.fat_per_100g)}g
                </Text>
              </View>
              <View style={styles.foodItemRight}>
                <Text style={styles.foodItemCalories}>
                  {Math.round(item.calories_per_100g)} kcal
                </Text>
                <View style={styles.foodItemActions}>
                  {item.is_custom && (
                    <TouchableOpacity
                      onPress={() => handleDeleteFood(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel={`Delete ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={19} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="add" size={22} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="nutrition-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Foods Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No matching foods found in your database'
                  : 'Start typing to search your foods or create a new custom food'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={offFoods}
          keyExtractor={(item, index) => `off-${item.barcode || index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.foodItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSelectFood(item, true)}
            >
              <View style={styles.foodItemInfo}>
                <Text style={[styles.foodItemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={styles.foodItemBrand}>
                  {item.brand ? `${item.brand} • ` : ''}Open Food Facts
                </Text>
                <Text style={styles.foodItemMacros}>
                  P: {Math.round(item.protein_per_100g)}g | C: {Math.round(item.carbs_per_100g)}g | F: {Math.round(item.fat_per_100g)}g
                </Text>
              </View>
              <View style={styles.foodItemRight}>
                <Text style={styles.foodItemCalories}>
                  {Math.round(item.calories_per_100g)} kcal
                </Text>
                <Ionicons name="add" size={22} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="globe-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>Open Food Facts Database</Text>
              <Text style={styles.emptySubtitle}>
                Search millions of global food products and barcode items
              </Text>
            </View>
          }
        />
      )}

      {/* ADD TO DIARY MODAL */}
      <Modal
        visible={selectedFood !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedFood(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedFood?.name}
                </Text>
                {!!selectedFood?.brand && (
                  <Text style={styles.modalSubtitle}>{selectedFood.brand}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedFood(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Serving Size Input */}
              <Text style={styles.inputLabel}>Serving Size (Grams)</Text>
              <View style={styles.gramsInputRow}>
                <TextInput
                  style={styles.gramsInput}
                  value={gramsInput}
                  onChangeText={setGramsInput}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={colors.textLight}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  selectTextOnFocus
                />
                <Text style={styles.gramsSuffix}>grams</Text>
              </View>

              {selectedFood?.isOFF &&
                selectedFood.calories_per_100g === 0 &&
                selectedFood.protein_per_100g === 0 &&
                selectedFood.fat_per_100g === 0 &&
                selectedFood.carbs_per_100g === 0 && (
                  <View style={styles.noDataNotice}>
                    <Text style={styles.noDataText}>
                      Open Food Facts has no nutrition data for this product, so all values are 0.
                    </Text>
                    <TouchableOpacity onPress={handleEnterManually}>
                      <Text style={styles.noDataLink}>Enter values manually</Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Calculated Macro Summary */}
              <View style={styles.calculatedMacrosBox}>
                <View style={styles.calculatedMacroCol}>
                  <Text style={styles.calcValue}>{calcCals}</Text>
                  <Text style={styles.calcLabel}>Calories</Text>
                </View>
                <View style={styles.calculatedMacroCol}>
                  <Text style={[styles.calcValue, { color: colors.protein }]}>{calcProt}g</Text>
                  <Text style={styles.calcLabel}>Protein</Text>
                </View>
                <View style={styles.calculatedMacroCol}>
                  <Text style={[styles.calcValue, { color: colors.carbs }]}>{calcCarbs}g</Text>
                  <Text style={styles.calcLabel}>Carbs</Text>
                </View>
                <View style={styles.calculatedMacroCol}>
                  <Text style={[styles.calcValue, { color: colors.fat }]}>{calcFat}g</Text>
                  <Text style={styles.calcLabel}>Fat</Text>
                </View>
              </View>

              {/* Meal Selector */}
              <Text style={styles.inputLabel}>Select Meal</Text>
              <View style={styles.mealSelectorRow}>
                {MEAL_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.mealOptionBtn,
                      selectedMeal === m.key && styles.mealOptionBtnActive,
                    ]}
                    onPress={() => setSelectedMeal(m.key)}
                  >
                    <Text
                      style={[
                        styles.mealOptionText,
                        selectedMeal === m.key && styles.mealOptionTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, addingToDiary && styles.buttonDisabled]}
                onPress={handleConfirmAddToDiary}
                disabled={addingToDiary}
              >
                {addingToDiary ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Add to Diary</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CREATE CUSTOM FOOD MODAL */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Custom Food</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Food Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Oatmeal with Whey"
                placeholderTextColor={colors.textLight}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                value={customName}
                onChangeText={setCustomName}
              />

              <Text style={styles.inputLabel}>Brand (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Quaker / Homemade"
                placeholderTextColor={colors.textLight}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                value={customBrand}
                onChangeText={setCustomBrand}
              />

              <Text style={styles.inputLabel}>Barcode (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 4032539018105"
                placeholderTextColor={colors.textLight}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                value={customBarcode}
                onChangeText={setCustomBarcode}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { marginTop: 12, fontWeight: '700' }]}>
                Nutritional Values (Per 100g)
              </Text>

              <View style={styles.macroInputRow}>
                <View style={styles.macroInputCol}>
                  <Text style={styles.macroInputLabel}>Calories (kcal) *</Text>
                  <TextInput
                    style={styles.macroTextInput}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="numeric"
                    value={customCalories}
                    onChangeText={setCustomCalories}
                  />
                </View>
                <View style={styles.macroInputCol}>
                  <Text style={styles.macroInputLabel}>Protein (g) *</Text>
                  <TextInput
                    style={styles.macroTextInput}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="numeric"
                    value={customProtein}
                    onChangeText={setCustomProtein}
                  />
                </View>
              </View>

              <View style={styles.macroInputRow}>
                <View style={styles.macroInputCol}>
                  <Text style={styles.macroInputLabel}>Carbs (g) *</Text>
                  <TextInput
                    style={styles.macroTextInput}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="numeric"
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                  />
                </View>
                <View style={styles.macroInputCol}>
                  <Text style={styles.macroInputLabel}>Fat (g) *</Text>
                  <TextInput
                    style={styles.macroTextInput}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="numeric"
                    value={customFat}
                    onChangeText={setCustomFat}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, creatingFood && styles.buttonDisabled]}
                onPress={handleCreateCustomFood}
                disabled={creatingFood}
              >
                {creatingFood ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Food</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* BARCODE SCANNER MODAL */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />

          {/* Scanner Overlay UI */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTopBar}>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={styles.scannerCloseButton}
              >
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.scannerTopTitle}>Scan Food Barcode</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={styles.scanTargetWrapper}>
              <View style={styles.scanTarget}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {false && (
                  <View style={styles.scannerLoadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.scannerLoadingText}>Searching product...</Text>
                  </View>
                )}
              </View>
              <Text style={styles.scannerHint}>
                Align barcode within the frame to scan
              </Text>
            </View>

            <View style={styles.scannerBottomBar}>
              <TouchableOpacity
                style={styles.cancelScanBtn}
                onPress={() => setShowScanner(false)}
              >
                <Text style={styles.cancelScanBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  searchSubmitButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  scanIconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  createFoodBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createFoodBarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginLeft: 6,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  foodItem: {
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
  foodItemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  foodItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  foodItemBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  foodItemMacros: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  foodItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  foodItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  foodItemCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.calories,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
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
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  noDataNotice: {
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  noDataText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noDataLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 8,
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
  gramsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gramsInput: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gramsSuffix: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 12,
  },
  calculatedMacrosBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    justifyContent: 'space-around',
  },
  calculatedMacroCol: {
    alignItems: 'center',
  },
  calcValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  calcLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mealSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  mealOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealOptionBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  mealOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mealOptionTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
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
  macroInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  macroInputCol: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  macroTextInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerTopTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  scannerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTargetWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTarget: {
    width: 260,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scannerHint: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  scannerLoadingBox: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scannerLoadingText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  scannerBottomBar: {
    paddingBottom: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  cancelScanBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  cancelScanBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
