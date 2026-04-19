import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../api/axios';
import { Pill } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/format';
import { colors } from '../theme/colors';

const TYPES = [
  { key: '', label: 'All' },
  { key: 'import', label: 'Stock In' },
  { key: 'export', label: 'Sales' },
];

export default function TransactionsList() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (type) params.type = type;
      const { data } = await api.get('/transactions', { params });
      setTxs(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load transactions',
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
    }, [type])
  );

  const totalIn = txs
    .filter((t) => t.type === 'import')
    .reduce((s, t) => s + t.totalAmount, 0);
  const totalOut = txs
    .filter((t) => t.type === 'export')
    .reduce((s, t) => s + t.totalAmount, 0);

  const renderItem = ({ item: t }) => {
    const isImport = t.type === 'import';
    return (
      <View style={styles.item}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isImport ? colors.infoBg : colors.successBg },
          ]}
        >
          <Ionicons
            name={isImport ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={isImport ? colors.info : colors.success}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pill
              label={isImport ? 'Stock In' : 'Sale'}
              color={isImport ? colors.info : colors.success}
              bg={isImport ? colors.infoBg : colors.successBg}
            />
            <Text style={styles.date}>{formatDate(t.createdAt)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {t.productName}
          </Text>
          <Text style={styles.meta}>
            {t.quantity} × {formatCurrency(t.pricePerUnit)}
            {t.party ? ` · ${t.party}` : ''}
          </Text>
        </View>
        <Text
          style={[
            styles.amount,
            { color: isImport ? colors.info : colors.success },
          ]}
        >
          {formatCurrency(t.totalAmount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.summary}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{txs.length}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Stock In</Text>
          <Text style={[styles.summaryValue, { color: colors.info }]}>
            {formatCurrency(totalIn)}
          </Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Sales</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totalOut)}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key || 'all'}
            onPress={() => setType(t.key)}
            style={[
              styles.chip,
              type === t.key && {
                backgroundColor: colors.brandLight,
                borderColor: colors.brand,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: type === t.key ? colors.brand : colors.textMuted,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={txs}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={38} color={colors.textLight} />
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>
                No transactions yet
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
  summary: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  summaryLabel: { color: colors.textMuted, fontSize: 11 },
  summaryValue: {
    fontWeight: '800',
    fontSize: 14,
    marginTop: 4,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '700', color: colors.text, marginTop: 6, fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  date: { color: colors.textLight, fontSize: 11 },
  amount: { fontWeight: '800', fontSize: 15, marginLeft: 8 },
  emptyBox: { padding: 36, alignItems: 'center' },
});
