export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Profile {
  username: string;
  email: string;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  goal: 'bulk' | 'cut' | 'maintain' | '';
  sex: 'male' | 'female' | '';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high' | '';
}

export interface Food {
  id: number;
  name: string;
  brand: string;
  barcode: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  source: 'manual' | 'open_food_facts';
  is_custom: boolean;
}

export interface FoodEntry {
  id: number;
  food: number;
  food_detail: Food;
  grams: number;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface DailySummary {
  date: string;
  totals: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  targets: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  } | null;
  remaining: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  } | null;
}

export interface Exercise {
  id: number;
  name: string;
  description: string;
  muscle_group: string;
}

export interface WorkoutSet {
  id: number;
  exercise: number;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
}

export interface Workout {
  id: number;
  name: string;
  date: string;
  notes: string;
  sets: WorkoutSet[];
  created_at: string;
}

export interface OFFSearchResult {
  name: string;
  brand: string;
  barcode: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  image_url: string;
}

export interface WeightLog {
  id: number;
  weight_kg: number;
  date: string;
  created_at: string;
}

export interface CalorieDay {
  date: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  target_calories: number | null;
}

export interface CalorieHistoryResponse {
  days: number;
  start_date: string;
  end_date: string;
  target_calories: number | null;
  history: CalorieDay[];
}
