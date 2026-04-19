import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/format';
import { Input, Pill } from '../components/ui';
import { colors } from '../theme/colors';

export default function BillsList() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/bills', { params });
      setBills(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load bills',
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
    }, [])
  );

  const total = bills.reduce((s, b) => s + b.totalAmount, 0);

  const renderItem = ({ item: b }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/bill/${b._id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="receipt-outline" size={20} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.billNo}>{b.billNumber}</Text>
          <Pill
            label={b.paymentMethod.toUpperCase()}
            color={colors.info}
            bg={colors.infoBg}
          />
        </View>
        <Text style={styles.customer} numberOfLines={1}>
          {b.customerName}
          {b.customerPhone ? ` · ${b.customerPhone}` : ''}
        </Text>
        <Text style={styles.date}>
          {formatDate(b.createdAt)} · {b.items.length} item
          {b.items.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={styles.amount}>{formatCurrency(b.totalAmount)}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textLight}
        style={{ marginLeft: 6 }}
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textLight}
            style={{ marginHorizontal: 10 }}
          />
          <Input
            placeholder="Bill number or customer…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {bills.length} bills · Total {formatCurrency(total)}
        </Text>
        <TouchableOpacity onPress={() => router.push('/billing')}>
          <Text style={{ color: colors.brand, fontWeight: '700' }}>+ New Bill</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={38} color={colors.textLight} />
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>
                No bills found
              </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
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
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: { color: colors.textMuted, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billNo: { fontWeight: '700', color: colors.text, fontSize: 14 },
  customer: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  date: { color: colors.textLight, marginTop: 2, fontSize: 11 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyBox: { padding: 36, alignItems: 'center' },
});
