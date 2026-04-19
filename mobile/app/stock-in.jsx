import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../src/api/axios';
import { Card, Input, Label, Button } from '../src/components/ui';
import { formatCurrency } from '../src/utils/format';
import { colors } from '../src/theme/colors';

export default function StockIn() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    productId: '',
    quantity: '1',
    pricePerUnit: '',
    party: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data));
  }, []);

  const selected = products.find((p) => p._id === form.productId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  const pickProduct = (p) => {
    setForm({
      ...form,
      productId: p._id,
      pricePerUnit: String(p.costPrice || ''),
    });
    setPickerOpen(false);
    setSearch('');
  };

  const submit = async () => {
    if (!form.productId)
      return Toast.show({ type: 'error', text1: 'Select a product' });
    setLoading(true);
    try {
      await api.post('/transactions', {
        type: 'import',
        productId: form.productId,
        quantity: Number(form.quantity),
        pricePerUnit: Number(form.pricePerUnit),
        party: form.party,
        note: form.note,
      });
      Toast.show({
        type: 'success',
        text1: 'Stock updated',
        text2: `Added ${form.quantity} ${selected?.unit || ''} to ${selected?.name || ''}`,
      });
      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: err.response?.data?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const total = Number(form.quantity || 0) * Number(form.pricePerUnit || 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Record new stock received from a supplier
        </Text>

        <Card style={{ padding: 18 }}>
          <Label>Product *</Label>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            style={styles.picker}
          >
            {selected ? (
              <View>
                <Text style={styles.pickerTitle}>{selected.name}</Text>
                <Text style={styles.pickerSub}>
                  {selected.sku} · Current: {selected.stock} {selected.unit}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textLight }}>
                Select a product…
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Label>Quantity *</Label>
              <Input
                keyboardType="number-pad"
                value={form.quantity}
                onChangeText={(v) => setForm({ ...form, quantity: v })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Cost / unit *</Label>
              <Input
                keyboardType="decimal-pad"
                value={form.pricePerUnit}
                onChangeText={(v) => setForm({ ...form, pricePerUnit: v })}
              />
            </View>
          </View>

          <Label style={{ marginTop: 14 }}>Supplier Name</Label>
          <Input
            value={form.party}
            onChangeText={(v) => setForm({ ...form, party: v })}
            placeholder="Optional"
          />

          <Label style={{ marginTop: 14 }}>Note</Label>
          <Input
            value={form.note}
            onChangeText={(v) => setForm({ ...form, note: v })}
            placeholder="Invoice number, reference..."
          />

          <View style={styles.totalBox}>
            <Text style={{ color: colors.textMuted }}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Button
              title="Record Stock In"
              onPress={submit}
              loading={loading}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => router.back()}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a Product</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 12 }}>
            <Input
              placeholder="Search name or SKU..."
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(i) => i._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickItem}
                onPress={() => pickProduct(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerTitle}>{item.name}</Text>
                  <Text style={styles.pickerSub}>
                    {item.sku} · Stock: {item.stock} {item.unit}
                  </Text>
                </View>
                <Text style={{ fontWeight: '700' }}>
                  {formatCurrency(item.costPrice)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: 'center',
                  color: colors.textMuted,
                  padding: 20,
                }}
              >
                No products found
              </Text>
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.textMuted, marginBottom: 12 },
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pickerTitle: { fontWeight: '700', color: colors.text },
  pickerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  row2: { flexDirection: 'row', gap: 12, marginTop: 14 },
  totalBox: {
    marginTop: 18,
    backgroundColor: colors.bg,
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  pickItem: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center',
  },
});
