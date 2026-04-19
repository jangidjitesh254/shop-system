import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../src/context/AuthContext';
import { Card, Input, Label, Button } from '../src/components/ui';
import { colors } from '../src/theme/colors';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.email || !form.password) {
      return Toast.show({ type: 'error', text1: 'Enter email and password' });
    }
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      Toast.show({ type: 'success', text1: 'Welcome back!' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBox}>
          <View style={styles.logo}>
            <Ionicons name="storefront" size={28} color="#fff" />
          </View>
          <Text style={styles.brand}>Shop Manager</Text>
          <Text style={styles.brandSub}>Sign in to manage your shop</Text>
        </View>

        <Card style={styles.card}>
          <Label>Email</Label>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            placeholder="you@shop.com"
          />

          <Label style={{ marginTop: 14 }}>Password</Label>
          <Input
            secureTextEntry
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
            placeholder="••••••••"
          />

          <Button
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={submit}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        </Card>

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: colors.brand, fontWeight: '700' }}>
              Register
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 80, flexGrow: 1 },
  brandBox: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  brand: { fontSize: 24, fontWeight: '800', color: colors.text },
  brandSub: { color: colors.textMuted, marginTop: 4 },
  card: { padding: 20 },
});
