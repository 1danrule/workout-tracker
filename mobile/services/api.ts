import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Automatically detect host IP from Expo bundler (e.g. 192.168.0.50)
// This ensures that physical iPhone running Expo Go connects directly to Django backend
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : '192.168.0.50';

// Optional public tunnel URL for remote testing from other networks (leave empty for local Wi-Fi)
const TUNNEL_URL = '';

const BASE_URL = TUNNEL_URL ? TUNNEL_URL : (Platform.OS === 'web'
  ? 'http://localhost:8000'
  : `http://${hostIp}:8000`);

const API = `${BASE_URL}/api`;

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'bypass-tunnel-reminder': 'true',
};

// Universal storage: SecureStore on native iOS/Android, localStorage on Web
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function loadTokens() {
  accessToken = await storage.getItem('accessToken');
  refreshToken = await storage.getItem('refreshToken');
}

export async function saveTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  await storage.setItem('accessToken', access);
  await storage.setItem('refreshToken', refresh);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await storage.deleteItem('accessToken');
  await storage.deleteItem('refreshToken');
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API}/auth/refresh/`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.access;
    await storage.setItem('accessToken', data.access);
    return true;
  } catch {
    return false;
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    ...(options.headers as Record<string, string> || {}),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.includes('localtunnel') || text.includes('tunnel')) {
      throw new Error('Туннель сервера временно недоступен. Проверьте соединение с компьютером.');
    }
    throw new Error(`Ответ сервера не в формате JSON (${res.status}): ${text.slice(0, 100)}`);
  }
}

// ---- Auth ----
export async function login(username: string, password: string) {
  const res = await fetch(`${API}/auth/login/`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || 'Invalid credentials');
  await saveTokens(data.access, data.refresh);
  return data;
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${API}/auth/register/`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ username, email, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    if (typeof data === 'object' && data !== null) {
      throw new Error(Object.values(data).flat().join(', '));
    }
    throw new Error('Registration failed');
  }
  return data;
}

// ---- Profile ----
export async function getProfile() {
  const res = await authFetch(`${API}/auth/profile/`);
  if (!res.ok) throw new Error('Failed to load profile');
  return parseJson(res);
}

export async function updateProfile(data: Record<string, any>) {
  const res = await authFetch(`${API}/auth/profile/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return parseJson(res);
}

// ---- Nutrition: Foods ----
export async function searchFoods(query: string) {
  const res = await authFetch(`${API}/nutrition/foods/?search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return parseJson(res);
}

export async function searchOFF(query: string, page = 1) {
  const res = await authFetch(`${API}/nutrition/off-search/?query=${encodeURIComponent(query)}&page=${page}`);
  if (!res.ok) throw new Error('OFF search failed');
  return parseJson(res);
}

export async function createFood(data: {
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
}) {
  const res = await authFetch(`${API}/nutrition/foods/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create food');
  return parseJson(res);
}

// ---- Nutrition: Entries ----
export async function getDiaryEntries(date: string) {
  const res = await authFetch(`${API}/nutrition/entries/?date=${date}`);
  if (!res.ok) throw new Error('Failed to load diary');
  return parseJson(res);
}

export async function addFoodEntry(data: {
  food: number;
  grams: number;
  date: string;
  meal: string;
}) {
  const res = await authFetch(`${API}/nutrition/entries/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add entry');
  return parseJson(res);
}

export async function deleteFoodEntry(id: number) {
  const res = await authFetch(`${API}/nutrition/entries/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete entry');
}

// ---- Nutrition: Summary ----
export async function getDailySummary(date: string) {
  const res = await authFetch(`${API}/nutrition/summary/?date=${date}`);
  if (!res.ok) throw new Error('Failed to load summary');
  return parseJson(res);
}

// ---- Workouts: Exercises ----
export async function getExercises() {
  const res = await authFetch(`${API}/exercises/`);
  if (!res.ok) throw new Error('Failed to load exercises');
  return parseJson(res);
}

// ---- Workouts ----
export async function getWorkouts(date?: string) {
  const url = date ? `${API}/workouts/?date=${date}` : `${API}/workouts/`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to load workouts');
  return parseJson(res);
}

export async function createWorkout(data: { name: string; date: string; notes?: string }) {
  const res = await authFetch(`${API}/workouts/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create workout');
  return parseJson(res);
}

export async function getWorkoutDetail(id: number) {
  const res = await authFetch(`${API}/workouts/${id}/`);
  if (!res.ok) throw new Error('Failed to load workout');
  return parseJson(res);
}

export async function deleteWorkout(id: number) {
  const res = await authFetch(`${API}/workouts/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete workout');
}

export async function addWorkoutSet(workoutId: number, data: {
  exercise: number;
  set_number: number;
  reps: number;
  weight_kg: number;
}) {
  const res = await authFetch(`${API}/workouts/${workoutId}/sets/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add set');
  return parseJson(res);
}

export async function deleteWorkoutSet(workoutId: number, setId: number) {
  const res = await authFetch(`${API}/workouts/${workoutId}/sets/${setId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete set');
}
