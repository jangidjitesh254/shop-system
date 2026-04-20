import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../src/context/AuthContext';
import { Card, Input, Label, Button } from '../src/components/ui';
import FormKeyboard from '../src/components/FormKeyboard';
import { colors } from '../src/theme/colors';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    shopName: '',
    shopAddress: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (k) => (v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    if (!form.name || !form.email || !form.password || !form.shopName) {
      return Toast.show({ type: 'error', text1: 'Fill required fields' });
    }
    if (form.password.length < 6) {
      return Toast.show({ type: 'error', text1: 'Password must be 6+ chars' });
    }
    setLoading(true);
    try {
      await register({ ...form, email: form.email.trim() });
      Toast.show({ type: 'success', text1: 'Account created' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormKeyboard contentPadding={20} bottomGap={260}>
      <Text style={styles.title}>Start managing your shop today</Text>

        <Card style={styles.card}>
          <Label>Your Name *</Label>
          <Input value={form.name} onChangeText={update('name')} />

          <Label style={styles.mt}>Shop Name *</Label>
          <Input value={form.shopName} onChangeText={update('shopName')} />

          <Label style={styles.mt}>Email *</Label>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={update('email')}
          />

          <Label style={styles.mt}>Password (min 6) *</Label>
          <Input
            secureTextEntry
            value={form.password}
            onChangeText={update('password')}
          />

          <Label style={styles.mt}>Phone (optional)</Label>
          <Input keyboardType="phone-pad" value={form.phone} onChangeText={update('phone')} />

          <Label style={styles.mt}>Shop Address (optional)</Label>
          <Input value={form.shopAddress} onChangeText={update('shopAddress')} />

          <Button
            title={loading ? 'Creating...' : 'Create Account'}
            onPress={submit}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        </Card>
    </FormKeyboard>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textMuted, marginBottom: 14 },
  card: { padding: 20 },
  mt: { marginTop: 14 },
});
