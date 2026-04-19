import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../src/api/axios';
import { formatCurrency } from '../../src/utils/format';
import { Input, Pill } from '../../src/components/ui';
import BarcodeScannerModal from '../../src/components/BarcodeScannerModal';
import { colors } from '../../src/theme/colors';

export default function Stock() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(params?.lowStock === 'true');
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = {};
      if (search.trim()) q.search = search.trim();
      if (lowStockOnly) q.lowStock = 'true';
      const { data } = await api.get('/products', { params: q });
      setProducts(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [lowStockOnly])
  );

  const onDelete = (id, name) => {
    Alert.alert('Delete product', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${id}`);
            Toast.show({ type: 'success', text1: 'Product deleted' });
            load(true);
          } catch (err) {
            Toast.show({
              type: 'error',
              text1: 'Delete failed',
              text2: err.response?.data?.message,
            });
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: p }) => {
    const isLow = p.stock <= p.lowStockAlert;
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={styles.thumb}>
            <Ionicons name="cube-outline" size={22} color={colors.brand} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.sku} numberOfLines={1}>
              {p.sku}
              {p.category ? ` · ${p.category}` : ''}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Cost {formatCurrency(p.costPrice)}</Text>
              <Text style={styles.metaBold}>
                Price {formatCurrency(p.sellingPrice)}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                styles.stock,
                { color: isLow ? colors.danger : colors.text },
              ]}
            >
              {p.stock} {p.unit}
            </Text>
            {isLow && (
              <Pill label="LOW" color={colors.danger} bg={colors.dangerBg} />
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/product-form', params: { id: p._id } })
            }
            style={styles.actionBtn}
          >
            <Ionicons name="create-outline" size={16} color={colors.brand} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            onPress={() => onDelete(p._id, p.name)}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.addBar}>
        <TouchableOpacity
          style={[styles.addCard, { backgroundColor: colors.brand }]}
          onPress={() => setScannerOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.addIconWrap}>
            <Ionicons name="scan-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addCardTitle}>Add with Scan</Text>
            <Text style={styles.addCardSub}>Capture barcode first</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addCard, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/product-form')}
          activeOpacity={0.85}
        >
          <View style={styles.addIconWrap}>
            <Ionicons name="create-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addCardTitle}>Manual Add</Text>
            <Text style={styles.addCardSub}>No-barcode items</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textLight}
            style={{ marginHorizontal: 10 }}
          />
          <Input
            placeholder="Search name or SKU…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity
          onPress={() => router.push('/stock-in')}
          style={styles.stockInBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down-circle-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setLowStockOnly((v) => !v)}
          style={[
            styles.chip,
            lowStockOnly && {
              backgroundColor: colors.brandLight,
              borderColor: colors.brand,
            },
          ]}
          activeOpacity={0.8}
        >
          {lowStockOnly && (
            <Ionicons
              name="checkmark"
              size={12}
              color={colors.brand}
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={{
              color: lowStockOnly ? colors.brand : colors.textMuted,
              fontWeight: '600',
              fontSize: 12,
            }}
          >
            Low stock only
          </Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {products.length} item{products.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={40} color={colors.textLight} />
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>
                No products found
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/product-form')}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: colors.brand, fontWeight: '700' }}>
                  Add your first product
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
            />
          }
        />
      )}

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          router.push({ pathname: '/product-form', params: { barcode: code } });
          Toast.show({
            type: 'success',
            text1: 'Barcode captured',
            text2: code,
            visibilityTime: 1500,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addBar: { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 6 },
  addCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addCardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  stockInBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  name: { fontWeight: '700', color: colors.text, fontSize: 15 },
  sku: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  meta: { color: colors.textMuted, fontSize: 12 },
  metaBold: { color: colors.text, fontSize: 12, fontWeight: '700' },
  stock: { fontWeight: '800', fontSize: 16, marginBottom: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionDivider: { width: 1, height: 16, backgroundColor: colors.border },
  actionText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { padding: 36, alignItems: 'center' },
});
