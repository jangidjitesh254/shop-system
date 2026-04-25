import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../src/api/axios';
import { Card, Input, Label, Button } from '../src/components/ui';
import FormKeyboard from '../src/components/FormKeyboard';
import CreditBlock from '../src/components/CreditBlock';
import QtyEditModal from '../src/components/QtyEditModal';
import { formatCurrency } from '../src/utils/format';
import { colors } from '../src/theme/colors';

const PAYMENTS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'credit', label: 'Udhaar' },
  { key: 'other', label: 'Other' },
];

export default function Billing() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [taxPercent, setTaxPercent] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [creditDays, setCreditDays] = useState('7');
  const [reminderDays, setReminderDays] = useState('2');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [qtyEditFor, setQtyEditFor] = useState(null);

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  const addToCart = (p) => {
    if (p.stock <= 0) {
      return Toast.show({ type: 'error', text1: `${p.name} is out of stock` });
    }
    const existing = cart.find((i) => i.productId === p._id);
    if (existing) {
      if (existing.quantity >= p.stock) {
        return Toast.show({
          type: 'error',
          text1: `Only ${p.stock} ${p.unit} available`,
        });
      }
      setCart(
        cart.map((i) =>
          i.productId === p._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: p._id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          stock: p.stock,
          pricePerUnit: p.sellingPrice,
          quantity: 1,
        },
      ]);
    }
    setSearch('');
    setPickerOpen(false);
  };

  const updateQty = (productId, delta) => {
    setCart(
      cart.map((i) => {
        if (i.productId !== productId) return i;
        const next = +(i.quantity + delta).toFixed(3);
        if (next <= 0) return i;
        if (next > i.stock) {
          Toast.show({
            type: 'error',
            text1: `Only ${i.stock} ${i.unit} available`,
          });
          return { ...i, quantity: i.stock };
        }
        return { ...i, quantity: next };
      })
    );
  };

  const setExactQty = (productId, qty) => {
    setCart(
      cart.map((i) => (i.productId !== productId ? i : { ...i, quantity: qty }))
    );
  };

  const setPrice = (productId, price) => {
    setCart(
      cart.map((i) =>
        i.productId === productId
          ? { ...i, pricePerUnit: Number(price) || 0 }
          : i
      )
    );
  };

  const removeItem = (productId) =>
    setCart(cart.filter((i) => i.productId !== productId));

  const subtotal = cart.reduce((s, i) => s + i.pricePerUnit * i.quantity, 0);
  const taxAmount = (subtotal * Number(taxPercent || 0)) / 100;
  const total = subtotal + taxAmount - Number(discount || 0);

  const submit = async () => {
    if (cart.length === 0) {
      return Toast.show({ type: 'error', text1: 'Add at least one item' });
    }
    if (paymentMethod === 'credit' && !customer.name.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Enter customer name for Udhaar',
      });
    }
    setSaving(true);
    try {
      const { data: bill } = await api.post('/bills', {
        customerName: customer.name || 'Walk-in Customer',
        customerPhone: customer.phone,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          pricePerUnit: i.pricePerUnit,
        })),
        taxPercent: Number(taxPercent),
        discount: Number(discount),
        paymentMethod,
        ...(paymentMethod === 'credit' && {
          creditDays: Number(creditDays) || 7,
          creditReminderDays: Number(reminderDays) || 2,
        }),
      });
      Toast.show({ type: 'success', text1: `Bill ${bill.billNumber} created` });
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setTaxPercent('0');
      setDiscount('0');
      setPaymentMethod('cash');
      setCreditDays('7');
      setReminderDays('2');
      router.push(`/bill/${bill._id}`);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create bill',
        text2: err.response?.data?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FormKeyboard contentPadding={12} bottomGap={280}>
        <Button
          title="Add Product to Cart"
          onPress={() => setPickerOpen(true)}
          style={{ marginBottom: 8 }}
        />

        <Card style={{ padding: 12 }}>
          <Text style={styles.blockTitle}>
            Cart {cart.length > 0 ? `(${cart.length})` : ''}
          </Text>

          {cart.length === 0 ? (
            <Text style={styles.empty}>
              Cart is empty. Tap the button above to add products.
            </Text>
          ) : (
            cart.map((i) => (
              <View key={i.productId} style={styles.cartItem}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{i.name}</Text>
                    <Text style={styles.itemSku}>{i.sku}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(i.productId)}
                    hitSlop={10}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.qtyRow}>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      onPress={() => updateQty(i.productId, -1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={16} color={colors.brand} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{i.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQty(i.productId, 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={16} color={colors.brand} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setQtyEditFor(i)}
                    style={styles.pencilBtn}
                    hitSlop={6}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.brand} />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Input
                      keyboardType="decimal-pad"
                      value={String(i.pricePerUnit)}
                      onChangeText={(v) => setPrice(i.productId, v)}
                      style={{ textAlign: 'right', paddingVertical: 8 }}
                    />
                  </View>

                  <Text style={styles.itemSubtotal}>
                    {formatCurrency(i.pricePerUnit * i.quantity)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {paymentMethod !== 'credit' && (
          <Card style={{ padding: 14, marginTop: 8 }}>
            <Text style={styles.blockTitle}>Customer</Text>
            <Label style={{ marginTop: 6 }}>Name</Label>
            <Input
              placeholder="Walk-in Customer"
              value={customer.name}
              onChangeText={(v) => setCustomer({ ...customer, name: v })}
            />
            <Label style={{ marginTop: 12 }}>Phone</Label>
            <Input
              keyboardType="phone-pad"
              placeholder="Optional"
              value={customer.phone}
              onChangeText={(v) => setCustomer({ ...customer, phone: v })}
            />
          </Card>
        )}

        <Card style={{ padding: 14, marginTop: 8 }}>
          <Text style={styles.blockTitle}>Billing</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Label>Tax %</Label>
              <Input
                keyboardType="decimal-pad"
                value={String(taxPercent)}
                onChangeText={setTaxPercent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Discount</Label>
              <Input
                keyboardType="decimal-pad"
                value={String(discount)}
                onChangeText={setDiscount}
              />
            </View>
          </View>

          <Label style={{ marginTop: 14 }}>Payment</Label>
          <View style={styles.payRow}>
            {PAYMENTS.map((p) => {
              const active = paymentMethod === p.key;
              const isCredit = p.key === 'credit';
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPaymentMethod(p.key)}
                  style={[
                    styles.payChip,
                    active && isCredit && {
                      backgroundColor: colors.warningBg,
                      borderColor: colors.warning,
                    },
                    active && !isCredit && {
                      backgroundColor: colors.brandLight,
                      borderColor: colors.brand,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      color: active
                        ? isCredit ? colors.warning : colors.brand
                        : colors.textMuted,
                      fontWeight: '600',
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {paymentMethod === 'credit' && (
            <CreditBlock
              customer={customer}
              onCustomerChange={(patch) =>
                setCustomer((c) => ({ ...c, ...patch }))
              }
              creditDays={creditDays}
              onCreditDaysChange={setCreditDays}
              reminderDays={reminderDays}
              onReminderDaysChange={setReminderDays}
            />
          )}

          <View style={styles.summary}>
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row label={`Tax (${taxPercent || 0}%)`} value={formatCurrency(taxAmount)} />
            <Row label="Discount" value={`-${formatCurrency(discount)}`} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <Button
            title={saving ? 'Creating...' : 'Create Bill'}
            onPress={submit}
            loading={saving}
            disabled={cart.length === 0}
            style={{ marginTop: 16 }}
          />
        </Card>
      </FormKeyboard>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Product</Text>
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
                onPress={() => addToCart(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSku}>
                    {item.sku} · Stock: {item.stock} {item.unit}
                  </Text>
                </View>
                <Text style={{ fontWeight: '700', color: colors.text }}>
                  {formatCurrency(item.sellingPrice)}
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

      <QtyEditModal
        visible={!!qtyEditFor}
        item={qtyEditFor}
        initialValue={qtyEditFor?.quantity}
        onClose={() => setQtyEditFor(null)}
        onSubmit={(qty) => {
          setExactQty(qtyEditFor.productId, qty);
          setQtyEditFor(null);
        }}
      />
    </>
  );
}

const Row = ({ label, value }) => (
  <View
    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
  >
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
    <Text style={{ color: colors.text, fontSize: 13 }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  blockTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 18 },
  cartItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 10,
  },
  itemName: { fontWeight: '600', color: colors.text },
  itemSku: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  qtyText: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minWidth: 28,
    textAlign: 'center',
  },
  pencilBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSubtotal: {
    fontWeight: '700',
    color: colors.text,
    minWidth: 78,
    textAlign: 'right',
  },
  payRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  payChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  summary: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 17, fontWeight: '700' },
  totalValue: { fontSize: 19, fontWeight: '800', color: colors.brand },
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
