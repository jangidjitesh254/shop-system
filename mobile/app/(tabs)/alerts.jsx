import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../src/api/axios';
import { formatCurrency } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';

const Section = ({ icon, title, count, tint, children }) => (
  <View style={styles.block}>
    <View style={styles.blockHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.sectionIcon, { backgroundColor: tint.bg }]}>
          <Ionicons name={icon} size={14} color={tint.fg} />
        </View>
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: tint.bg }]}>
        <Text style={[styles.badgeText, { color: tint.fg }]}>{count}</Text>
      </View>
    </View>
    {children}
  </View>
);

const SummaryTile = ({ icon, label, value, color, onPress }) => {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[styles.tile, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.tileIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Wrap>
  );
};

const EmptyLine = ({ label }) => <Text style={styles.emptyLine}>{label}</Text>;

export default function Alerts() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [creditReminders, setCreditReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, b, c] = await Promise.all([
        api.get('/products'),
        api.get('/bills'),
        api.get('/credit/reminders').catch(() => ({ data: [] })),
      ]);
      setProducts(p.data);
      setBills(b.data);
      setCreditReminders(c.data || []);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load alerts',
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

  if (loading && products.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthBills = bills.filter((b) => new Date(b.createdAt) >= monthStart);
  const todayBills = bills.filter((b) => new Date(b.createdAt) >= todayStart);

  const aggregate = (billList) => {
    const m = new Map();
    billList.forEach((b) => {
      b.items?.forEach((it) => {
        const key = String(it.product || it.productId || it.name);
        const prev = m.get(key) || {
          name: it.name,
          sku: it.sku || '',
          qty: 0,
          revenue: 0,
        };
        prev.qty += Number(it.quantity) || 0;
        prev.revenue +=
          Number(it.subtotal) ||
          (Number(it.pricePerUnit) || 0) * (Number(it.quantity) || 0);
        m.set(key, prev);
      });
    });
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  };

  const topSellers = aggregate(monthBills).slice(0, 5);
  const todayTopSellers = aggregate(todayBills).slice(0, 5);

  const outOfStock = products.filter((p) => p.stock <= 0);
  const lowStock = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockAlert
  );
  const pending = bills.filter(
    (b) =>
      b.paymentStatus &&
      b.paymentStatus !== 'paid' &&
      b.paymentMethod !== 'credit'
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(true);
          }}
        />
      }
    >
      <View style={styles.summaryRow}>
        <SummaryTile
          icon="close-circle"
          label="Out of stock"
          value={outOfStock.length}
          color={colors.danger}
          onPress={
            outOfStock.length > 0
              ? () =>
                  router.push({
                    pathname: '/(tabs)/stock',
                    params: { lowStock: 'true' },
                  })
              : undefined
          }
        />
        <SummaryTile
          icon="warning"
          label="Low stock"
          value={lowStock.length}
          color={colors.warning}
          onPress={
            lowStock.length > 0
              ? () =>
                  router.push({
                    pathname: '/(tabs)/stock',
                    params: { lowStock: 'true' },
                  })
              : undefined
          }
        />
        <SummaryTile
          icon="wallet"
          label="Udhaar"
          value={creditReminders.length}
          color={colors.warning}
          onPress={
            creditReminders.length > 0
              ? () => router.push('/credit')
              : undefined
          }
        />
      </View>

      <Section
        icon="wallet"
        title="Credit Collection Due (Udhaar)"
        count={creditReminders.length}
        tint={{ bg: colors.warningBg, fg: colors.warning }}
      >
        {creditReminders.length === 0 ? (
          <EmptyLine label="No credit payments due soon." />
        ) : (
          creditReminders.map((r, i) => (
            <TouchableOpacity
              key={r._id}
              style={[
                styles.row,
                i === creditReminders.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/credit/[name]',
                  params: { name: r.customerName },
                })
              }
            >
              <View style={styles.rank}>
                <Ionicons
                  name="person"
                  size={14}
                  color={colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{r.customerName}</Text>
                <Text
                  style={[
                    styles.rowSub,
                    {
                      color: r.overdue ? colors.danger : colors.warning,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {r.overdue
                    ? `Overdue by ${Math.abs(r.daysRemaining)} day${Math.abs(r.daysRemaining) !== 1 ? 's' : ''}`
                    : r.daysRemaining === 0
                    ? 'Due today'
                    : `Due in ${r.daysRemaining} day${r.daysRemaining !== 1 ? 's' : ''}`}
                </Text>
                {r.customerPhone ? (
                  <Text style={styles.rowSub}>{r.customerPhone}</Text>
                ) : null}
              </View>
              <Text style={styles.amount}>
                {formatCurrency(r.totalAmount)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Section
        icon="close-circle"
        title="Out of Stock"
        count={outOfStock.length}
        tint={{ bg: colors.dangerBg, fg: colors.danger }}
      >
        {outOfStock.length === 0 ? (
          <EmptyLine label="Nothing is out of stock." />
        ) : (
          outOfStock.map((p, i) => (
            <TouchableOpacity
              key={p._id}
              style={[
                styles.row,
                i === outOfStock.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => router.push('/stock-in')}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowSub}>{p.sku}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.dangerBg }]}>
                <Text style={[styles.chipText, { color: colors.danger }]}>
                  0 in stock
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Section
        icon="warning"
        title="Low Stock"
        count={lowStock.length}
        tint={{ bg: colors.warningBg, fg: colors.warning }}
      >
        {lowStock.length === 0 ? (
          <EmptyLine label="All items above their alert threshold." />
        ) : (
          lowStock.map((p, i) => (
            <TouchableOpacity
              key={p._id}
              style={[
                styles.row,
                i === lowStock.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => router.push('/stock-in')}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowSub}>{p.sku}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 6 }}>
                <Text style={styles.warnText}>
                  {p.stock} {p.unit}
                </Text>
                <Text style={styles.rowSub}>alert at {p.lowStockAlert}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Section
        icon="flash"
        title="Today's Top Sellers"
        count={todayTopSellers.length}
        tint={{ bg: colors.successBg, fg: colors.success }}
      >
        {todayTopSellers.length === 0 ? (
          <EmptyLine label="No sales today yet." />
        ) : (
          todayTopSellers.map((s, i) => (
            <View
              key={i}
              style={[
                styles.row,
                i === todayTopSellers.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View
                style={[
                  styles.rank,
                  { backgroundColor: colors.successBg },
                ]}
              >
                <Text
                  style={[styles.rankText, { color: colors.success }]}
                >
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{s.name}</Text>
                <Text style={styles.rowSub}>
                  {s.qty} sold · {formatCurrency(s.revenue)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Section>

      <Section
        icon="trophy"
        title="Top Sellers · This Month"
        count={topSellers.length}
        tint={{ bg: colors.accentBg, fg: colors.accent }}
      >
        {topSellers.length === 0 ? (
          <EmptyLine label="No sales this month yet." />
        ) : (
          topSellers.map((s, i) => (
            <View
              key={i}
              style={[
                styles.row,
                i === topSellers.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.rank}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{s.name}</Text>
                <Text style={styles.rowSub}>
                  {s.qty} sold · {formatCurrency(s.revenue)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Section>

      <Section
        icon="card"
        title="Pending Payments"
        count={pending.length}
        tint={{ bg: colors.infoBg, fg: colors.info }}
      >
        {pending.length === 0 ? (
          <EmptyLine label="No unpaid bills." />
        ) : (
          pending.slice(0, 10).map((b, i) => (
            <TouchableOpacity
              key={b._id}
              style={[
                styles.row,
                i === Math.min(pending.length, 10) - 1 && {
                  borderBottomWidth: 0,
                },
              ]}
              onPress={() => router.push(`/bill/${b._id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{b.billNumber}</Text>
                <Text style={styles.rowSub}>
                  {b.customerName}
                  {b.customerPhone ? ` · ${b.customerPhone}` : ''}
                </Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(b.totalAmount)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 10,
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  tileLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  block: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontWeight: '800', fontSize: 12 },
  emptyLine: {
    color: colors.textMuted,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 10,
  },
  rowName: { fontWeight: '600', color: colors.text, fontSize: 14 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  warnText: { fontWeight: '700', color: colors.warning },
  amount: { fontWeight: '700', color: colors.text },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.accent, fontWeight: '800' },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 4,
  },
  chipText: { fontWeight: '700', fontSize: 11 },
});
