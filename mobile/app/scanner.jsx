import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Vibration,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../src/api/axios';
import { formatCurrency } from '../src/utils/format';
import { Card, Input, Label, Button } from '../src/components/ui';
import { colors } from '../src/theme/colors';

const BARCODE_TYPES = [
  'aztec',
  'ean13',
  'ean8',
  'qr',
  'pdf417',
  'upc_e',
  'upc_a',
  'datamatrix',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'code128',
];

const PAYMENTS = ['cash', 'card', 'upi', 'other'];

export default function Scanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [lookingUp, setLookingUp] = useState(false);
  const [lastCode, setLastCode] = useState(null);
  const [torch, setTorch] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [unknownCode, setUnknownCode] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');

  const scanLockRef = useRef(false);
  const lastScanRef = useRef({ code: null, at: 0 });

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [products, search]);

  const addOrIncrement = (p) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p._id);
      if (existing) {
        if (existing.quantity >= p.stock) {
          Toast.show({
            type: 'error',
            text1: `Only ${p.stock} ${p.unit} in stock`,
          });
          return prev;
        }
        return prev.map((i) =>
          i.productId === p._id
            ? { ...i, quantity: i.quantity + 1, stock: p.stock }
            : i
        );
      }
      if (p.stock <= 0) {
        Toast.show({ type: 'error', text1: `${p.name} is out of stock` });
        return prev;
      }
      return [
        ...prev,
        {
          productId: p._id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          stock: p.stock,
          pricePerUnit: p.sellingPrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleScan = async ({ data }) => {
    if (!data || scanLockRef.current) return;

    const code = String(data).trim();
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 1500) return;
    lastScanRef.current = { code, at: now };
    scanLockRef.current = true;

    Vibration.vibrate(40);
    setLookingUp(true);
    setLastCode(code);

    try {
      const { data: product } = await api.get(
        `/products/barcode/${encodeURIComponent(code)}`
      );
      setUnknownCode(null);
      addOrIncrement(product);
      Toast.show({
        type: 'success',
        text1: `Added: ${product.name}`,
        text2: formatCurrency(product.sellingPrice),
        visibilityTime: 1100,
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setUnknownCode(code);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Lookup failed',
          text2: err.message,
        });
      }
    } finally {
      setLookingUp(false);
      setTimeout(() => {
        scanLockRef.current = false;
      }, 900);
    }
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const next = i.quantity + delta;
          if (next < 1) return null;
          if (next > i.stock) {
            Toast.show({
              type: 'error',
              text1: `Only ${i.stock} ${i.unit} available`,
            });
            return { ...i, quantity: i.stock };
          }
          return { ...i, quantity: next };
        })
        .filter(Boolean)
    );
  };

  const removeItem = (productId) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId));

  const subtotal = cart.reduce((s, i) => s + i.pricePerUnit * i.quantity, 0);

  const submit = async () => {
    if (cart.length === 0) {
      return Toast.show({ type: 'error', text1: 'Scan at least one item' });
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
        taxPercent: 0,
        discount: 0,
        paymentMethod,
      });
      Toast.show({ type: 'success', text1: `Bill ${bill.billNumber} created` });
      setCart([]);
      setCustomer({ name: '', phone: '' });
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

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={56} color={colors.textLight} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>
          Shop Manager needs camera access to scan product barcodes.
        </Text>
        <Button
          title="Grant Permission"
          onPress={requestPermission}
          style={{ marginTop: 18, minWidth: 220 }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="on"
          enableTorch={torch}
          onBarcodeScanned={handleScan}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        />

        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>
            {lookingUp ? 'Looking up…' : 'Align barcode inside the frame'}
          </Text>

          <View style={styles.cameraActions}>
            <TouchableOpacity
              onPress={() => setTorch((v) => !v)}
              style={[styles.camBtn, torch && styles.camBtnActive]}
              activeOpacity={0.85}
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-outline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.camBtnText}>Flash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              style={styles.camBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.camBtnText}>Manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>
              Cart {cart.length > 0 ? `(${cart.length})` : ''}
            </Text>
            {lastCode ? (
              <Text style={styles.sheetMeta} numberOfLines={1}>
                Last scan: {lastCode}
              </Text>
            ) : null}
          </View>
          <Text style={styles.sheetTotal}>{formatCurrency(subtotal)}</Text>
        </View>

        {unknownCode && (
          <View style={styles.unknown}>
            <View style={styles.unknownHead}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.unknownTitle}>Unknown barcode</Text>
            </View>
            <Text style={styles.unknownCode} selectable>
              {unknownCode}
            </Text>
            <Text style={styles.unknownHint}>
              This product isn't in your shop yet. Add it now so it's scannable
              next time.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button
                title="Add this product"
                onPress={() => {
                  const code = unknownCode;
                  setUnknownCode(null);
                  router.push({
                    pathname: '/product-form',
                    params: { barcode: code },
                  });
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Dismiss"
                variant="secondary"
                onPress={() => setUnknownCode(null)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {cart.length === 0 && !unknownCode ? (
          <View style={styles.emptyBox}>
            <Ionicons name="barcode-outline" size={36} color={colors.textLight} />
            <Text style={styles.empty}>
              Point the camera at a product barcode.{'\n'}Items will appear here.
            </Text>
          </View>
        ) : (
          cart.map((i) => (
            <View key={i.productId} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {i.name}
                </Text>
                <Text style={styles.itemSub}>
                  {formatCurrency(i.pricePerUnit)} · {i.sku}
                </Text>
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity
                  onPress={() => changeQty(i.productId, -1)}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="remove" size={16} color={colors.brand} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{i.quantity}</Text>
                <TouchableOpacity
                  onPress={() => changeQty(i.productId, 1)}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="add" size={16} color={colors.brand} />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemSubtotal}>
                {formatCurrency(i.pricePerUnit * i.quantity)}
              </Text>
              <TouchableOpacity
                onPress={() => removeItem(i.productId)}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {cart.length > 0 && (
          <Card style={{ padding: 14, marginTop: 12 }}>
            <Label>Customer (optional)</Label>
            <Input
              placeholder="Walk-in Customer"
              value={customer.name}
              onChangeText={(v) => setCustomer({ ...customer, name: v })}
            />
            <Label style={{ marginTop: 12 }}>Phone</Label>
            <Input
              keyboardType="phone-pad"
              value={customer.phone}
              onChangeText={(v) => setCustomer({ ...customer, phone: v })}
            />

            <Label style={{ marginTop: 14 }}>Payment</Label>
            <View style={styles.payRow}>
              {PAYMENTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPaymentMethod(p)}
                  style={[
                    styles.payChip,
                    paymentMethod === p && {
                      backgroundColor: colors.brandLight,
                      borderColor: colors.brand,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        paymentMethod === p ? colors.brand : colors.textMuted,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={
                saving
                  ? 'Creating…'
                  : `Create Bill  ·  ${formatCurrency(subtotal)}`
              }
              onPress={submit}
              loading={saving}
              style={{ marginTop: 14 }}
            />
          </Card>
        )}
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pick a Product</Text>
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
                onPress={() => {
                  addOrIncrement(item);
                  setPickerOpen(false);
                  setSearch('');
                  Toast.show({
                    type: 'success',
                    text1: `Added: ${item.name}`,
                    visibilityTime: 900,
                  });
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {item.sku} · Stock: {item.stock} {item.unit}
                  </Text>
                </View>
                <Text style={{ fontWeight: '700' }}>
                  {formatCurrency(item.sellingPrice)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  padding: 30,
                  textAlign: 'center',
                  color: colors.textMuted,
                }}
              >
                No products found
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const FRAME_HEIGHT = 170;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
  },
  permText: {
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraWrap: { height: '44%', backgroundColor: '#000', overflow: 'hidden' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '80%',
    height: FRAME_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff' },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  hint: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 16,
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cameraActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  camBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  camBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  camBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sheetMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sheetTotal: { fontSize: 18, fontWeight: '800', color: colors.brand },
  emptyBox: { alignItems: 'center', paddingVertical: 34 },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  itemName: { fontWeight: '700', color: colors.text },
  itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#fff' },
  qtyText: {
    paddingHorizontal: 10,
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
  },
  itemSubtotal: {
    minWidth: 64,
    textAlign: 'right',
    fontWeight: '700',
    color: colors.text,
  },
  payRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  payChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  unknown: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  unknownHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unknownTitle: { fontWeight: '800', color: colors.danger, fontSize: 14 },
  unknownCode: {
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
    fontSize: 13,
  },
  unknownHint: { color: colors.text, fontSize: 12, marginTop: 6 },
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
