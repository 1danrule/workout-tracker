import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>🏋️ FitTracker</Text>
        <Text style={styles.subtitle}>Track your nutrition & workouts</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.textLight}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textLight}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: Colors.text },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 14, color: Colors.textSecondary },
  linkBold: { color: Colors.primary, fontWeight: '600' },
});
