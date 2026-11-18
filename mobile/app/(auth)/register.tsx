import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start tracking your fitness journey</Text>

        <TextInput style={styles.input} placeholder="Username" placeholderTextColor={colors.textLight}
          value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textLight}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textLight}
          value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor={colors.textLight}
          value={confirm} onChangeText={setConfirm} secureTextEntry />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister} disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: Colors.text },
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
