export const LightColors = {
  primary: '#2F5D8C', // single restrained steel-blue accent
  primaryDark: '#244B73', // accent text on surfaces
  primaryLight: '#E6EDF5', // tinted chip / soft button background
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceVariant: '#ECEEF1',
  text: '#14171C',
  textSecondary: '#5A616C',
  textLight: '#9097A2',
  border: '#DDE0E5',
  error: '#C0463F',
  warning: '#B7791F',
  // Macro colors (muted)
  calories: '#C9733A',
  caloriesLight: '#F6ECE4',
  protein: '#4A7BB0',
  proteinLight: '#E6EDF5',
  fat: '#B0566B',
  fatLight: '#F3E7EA',
  fatDark: '#8E3F52',
  carbs: '#A8873A',
  carbsLight: '#F4EFE2',
  carbsDark: '#7D6224',
  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(10,12,16,0.5)',
  success: '#3C8D6E',
  cardBg: '#FFFFFF',
};

export const DarkColors = {
  primary: '#4C78B0',
  primaryDark: '#8FB3DE', // accent text on dark surfaces
  primaryLight: 'rgba(76,120,176,0.18)',
  background: '#0D0F12',
  surface: '#16191E',
  surfaceVariant: '#1E2229',
  text: '#ECEEF1',
  textSecondary: '#9AA1AC',
  textLight: '#5F6672',
  border: '#2A2F37',
  error: '#E0716A',
  warning: '#D9A24A',
  // Macro colors (muted)
  calories: '#D9854F',
  caloriesLight: 'rgba(217,133,79,0.14)',
  protein: '#6B96C8',
  proteinLight: 'rgba(107,150,200,0.14)',
  fat: '#C77589',
  fatLight: 'rgba(199,117,137,0.14)',
  fatDark: '#E0A0AE',
  carbs: '#C7A55C',
  carbsLight: 'rgba(199,165,92,0.14)',
  carbsDark: '#DCC17E',
  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.65)',
  success: '#5DB08E',
  cardBg: '#16191E',
};

export type ThemeColors = typeof LightColors;

// Default export for backward compatibility
export const Colors: ThemeColors = LightColors;
