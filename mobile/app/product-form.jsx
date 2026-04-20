import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../src/api/axios';
import { Card, Input, Label, Button } from '../src/components/ui';
import BarcodeScannerModal from '../src/components/BarcodeScannerModal';
import FormKeyboard from '../src/components/FormKeyboard';
import { colors } from '../src/theme/colors';

const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack'];

const empty = {
  name: '',
  sku: '',
  barcode: '',
  category: 'General',
  unit: 'pcs',
  costPrice: '',
  sellingPrice: '',
  stock: '0',
  lowStockAlert: '5',
  description: '',
};

export default function ProductForm() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, barcode: prefillBarcode } = useLocalSearchParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(
    prefillBarcode ? { ...empty, barcode: String(prefillBarcode) } : empty
  );
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Product' : 'Add Product' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/products/${id}`).then(({ data }) => {
      setForm({
        ...data,
        costPrice: String(data.costPrice ?? ''),
        sellingPrice: String(data.sellingPrice ?? ''),
        stock: String(data.stock ?? 0),
        lowStockAlert: String(data.lowStockAlert ?? 5),
      });
    });
  }, [id]);

  const update = (k) => (v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    if (!form.name || !form.sku || !form.costPrice || !form.sellingPrice) {
      return Toast.show({ type: 'error', text1: 'Fill required fields' });
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        stock: Number(form.stock),
        lowStockAlert: Number(form.lowStockAlert),
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        Toast.show({ type: 'success', text1: 'Product updated' });
      } else {
        await api.post('/products', payload);
        Toast.show({ type: 'success', text1: 'Product added' });
      }
      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: err.response?.data?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormKeyboard>
        <Card style={{ padding: 18 }}>
          <Label>Product Name *</Label>
          <Input value={form.name} onChangeText={update('name')} />

          <Label style={styles.mt}>SKU / Code *</Label>
          <Input
            value={form.sku}
            onChangeText={update('sku')}
            placeholder="e.g. SKU-001"
          />

          <Label style={styles.mt}>Barcode (EAN / UPC)</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input
              value={form.barcode}
              onChangeText={update('barcode')}
              placeholder="Scan or type"
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              onPress={() => setScannerOpen(true)}
              style={styles.scanBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={22} color={colors.brand} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Scan the barcode so it can be auto-recognized at billing time.
          </Text>

          <Label style={styles.mt}>Category</Label>
          <Input value={form.category} onChangeText={update('category')} />

          <Label style={styles.mt}>Unit</Label>
          <View style={styles.unitRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => update('unit')(u)}
                style={[
                  styles.chip,
                  form.unit === u && {
                    backgroundColor: colors.brandLight,
                    borderColor: colors.brand,
                  },
                ]}
              >
                <Text
                  style={{
                    color: form.unit === u ? colors.brand : colors.textMuted,
                    fontWeight: '600',
                  }}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Label>Cost Price *</Label>
              <Input
                keyboardType="decimal-pad"
                value={form.costPrice}
                onChangeText={update('costPrice')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Selling Price *</Label>
              <Input
                keyboardType="decimal-pad"
                value={form.sellingPrice}
                onChangeText={update('sellingPrice')}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Label>Current Stock</Label>
              <Input
                editable={!isEdit}
                keyboardType="number-pad"
                value={form.stock}
                onChangeText={update('stock')}
              />
              {isEdit && (
                <Text style={styles.hint}>Use Stock In to adjust</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Label>Low Stock Alert</Label>
              <Input
                keyboardType="number-pad"
                value={form.lowStockAlert}
                onChangeText={update('lowStockAlert')}
              />
            </View>
          </View>

          <Label style={styles.mt}>Description</Label>
          <Input
            multiline
            numberOfLines={3}
            value={form.description}
            onChangeText={update('description')}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <Button
              title={isEdit ? 'Update' : 'Add Product'}
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
      </FormKeyboard>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          update('barcode')(code);
          setScannerOpen(false);
          Toast.show({
            type: 'success',
            text1: 'Barcode captured',
            text2: code,
            visibilityTime: 1500,
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: 14 },
  row2: { flexDirection: 'row', gap: 12, marginTop: 14 },
  unitRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  hint: { color: colors.textLight, fontSize: 11, marginTop: 4 },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
