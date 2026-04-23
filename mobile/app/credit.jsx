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
import api from '../src/api/axios';
import { formatCurrency } from '../src/utils/format';
import { colors } from '../src/theme/colors';

const daysUntil = (d) => {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

export default function CreditList() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/credit/customers');
      setCustomers(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load credit list',
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

  const totalOutstanding = customers.reduce(
    (s, c) => s + (c.outstanding || 0),
    0
  );

  const renderItem = ({ item: c }) => {
    const days = daysUntil(c.nearestDue);
    const overdue = days != null && days < 0;
    const isUnpaid = c.outstanding > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: '/credit/[name]',
            params: { name: c.name },
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {c.name?.trim()?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {c.name}
          </Text>
          {c.phone ? (
            <Text style={styles.phone}>{c.phone}</Text>
          ) : (
            <Text style={styles.phone}>
              {c.totalBills} bill{c.totalBills !== 1 ? 's' : ''}
            </Text>
          )}
          {isUnpaid && c.nearestDue ? (
            <Text
              style={[
                styles.due,
                { color: overdue ? colors.danger : colors.warning },
              ]}
            >
              {overdue
                ? `Overdue by ${Math.abs(days)}d`
                : `Due in ${days}d`}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.outstanding,
              { color: isUnpaid ? colors.danger : colors.success },
            ]}
          >
            {formatCurrency(c.outstanding)}
          </Text>
          {!isUnpaid && (
            <Text style={styles.settled}>settled</Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textLight}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Ionicons name="wallet" size={18} color={colors.warning} />
          <Text style={styles.summaryLabel}>Total outstanding</Text>
        </View>
        <Text style={styles.summaryValue}>
          {formatCurrency(totalOutstanding)}
        </Text>
        <Text style={styles.summarySub}>
          from {customers.filter((c) => c.outstanding > 0).length} customer(s)
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(i) => i.name}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="wallet-outline"
                size={40}
                color={colors.textLight}
              />
              <Text style={styles.emptyTitle}>No credit sales yet</Text>
              <Text style={styles.emptyText}>
                When you select "Udhaar" as the payment method while billing,
                the customer appears here.
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
    margin: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
  },
  summarySub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 36, alignItems: 'center' },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 10,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.warning, fontWeight: '800', fontSize: 18 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  phone: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  due: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  outstanding: { fontSize: 16, fontWeight: '800' },
  settled: { fontSize: 10, color: colors.textLight, marginTop: 2 },
});
