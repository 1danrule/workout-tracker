export const LightColors = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  primaryLight: '#C8E6C9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F0F0',
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#BDBDBD',
  border: '#E0E0E0',
  error: '#F44336',
  warning: '#FF9800',
  // Macro colors
  calories: '#FF6B35',
  caloriesLight: '#FFEBE5',
  protein: '#2196F3',
  proteinLight: '#E3F2FD',
  fat: '#FF5722',
  fatLight: '#FBE9E7',
  fatDark: '#D84315',
  carbs: '#FFC107',
  carbsLight: '#FFF8E1',
  carbsDark: '#FFA000',
  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  success: '#4CAF50',
  cardBg: '#FFFFFF',
};

export const DarkColors = {
  primary: '#66BB6A',
  primaryDark: '#4CAF50',
  primaryLight: '#1B3821',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#A5A5A5',
  textLight: '#707070',
  border: '#2E2E2E',
  error: '#EF5350',
  warning: '#FFA726',
  // Macro colors
  calories: '#FF7A45',
  caloriesLight: '#3D1C11',
  protein: '#42A5F5',
  proteinLight: '#13283E',
  fat: '#FF7043',
  fatLight: '#3B1D15',
  fatDark: '#FF8A65',
  carbs: '#FFCA28',
  carbsLight: '#3D3315',
  carbsDark: '#FFE082',
  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  success: '#66BB6A',
  cardBg: '#1E1E1E',
};

export type ThemeColors = typeof LightColors;

// Default export for backward compatibility
export const Colors: ThemeColors = LightColors;
