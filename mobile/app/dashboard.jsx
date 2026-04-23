import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../src/api/axios';
import { formatCurrency, formatDate, formatDateShort } from '../src/utils/format';
import { colors } from '../src/theme/colors';

const StatCard = ({ label, value, sub, icon, tint }) => (
  <View style={styles.stat}>
    <View style={styles.statTop}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.statIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={16} color={tint.fg} />
      </View>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfit, setShowProfit] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load analytics',
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

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger }}>Failed to load</Text>
      </View>
    );
  }

  const chartData = stats.salesByDay?.length
    ? {
        labels: stats.salesByDay.map((d) => formatDateShort(d.date)),
        datasets: [{ data: stats.salesByDay.map((d) => Number(d.total) || 0) }],
      }
    : null;

  const chartWidth = Dimensions.get('window').width - 32;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Today's Revenue</Text>
        <Text style={styles.heroValue}>{formatCurrency(stats.todayRevenue)}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroItem}>
            <Text style={styles.heroItemLabel}>Bills today</Text>
            <Text style={styles.heroItemValue}>{stats.todayBillCount}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroItem}>
            <Text style={styles.heroItemLabel}>This month</Text>
            <Text style={styles.heroItemValue}>
              {formatCurrency(stats.monthRevenue)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stock-in summary — includes new product additions AND restocking */}
      <View style={styles.stockInCard}>
        <View style={styles.stockInHead}>
          <View style={styles.stockInIcon}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={18}
              color={colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stockInTitle}>Stock Imports</Text>
            <Text style={styles.stockInMeta}>
              New products + restock purchases
            </Text>
          </View>
        </View>
        <View style={styles.stockInRow}>
          <View style={styles.stockInItem}>
            <Text style={styles.stockInLabel}>Today</Text>
            <Text style={styles.stockInValue}>
              {formatCurrency(stats.todayStockIn || 0)}
            </Text>
            <Text style={styles.stockInSub}>
              {stats.todayStockInCount || 0} entr{(stats.todayStockInCount || 0) !== 1 ? 'ies' : 'y'}
            </Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.stockInItem}>
            <Text style={styles.stockInLabel}>This month</Text>
            <Text style={styles.stockInValue}>
              {formatCurrency(stats.monthStockIn || 0)}
            </Text>
            <Text style={styles.stockInSub}>
              {stats.monthStockInCount || 0} entr{(stats.monthStockInCount || 0) !== 1 ? 'ies' : 'y'}
            </Text>
          </View>
        </View>
      </View>

      {/* Profit toggle */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowProfit((v) => !v)}
        style={styles.profitCard}
      >
        <View style={styles.profitHead}>
          <View style={styles.profitIcon}>
            <Ionicons name="trending-up" size={18} color={colors.success} />
          </View>
          <Text style={styles.profitTitle}>Profit</Text>
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.eyeBtn,
              showProfit && { backgroundColor: colors.success },
            ]}
          >
            <Ionicons
              name={showProfit ? 'eye-off-outline' : 'eye-outline'}
              size={14}
              color={showProfit ? '#fff' : colors.success}
            />
            <Text
              style={[
                styles.eyeText,
                { color: showProfit ? '#fff' : colors.success },
              ]}
            >
              {showProfit ? 'Hide' : 'Show'}
            </Text>
          </View>
        </View>

        {showProfit ? (
          <View style={styles.profitBody}>
            <View style={styles.profitItem}>
              <Text style={styles.profitLabel}>Today</Text>
              <Text style={styles.profitValue}>
                {formatCurrency(stats.todayProfit || 0)}
              </Text>
              <View style={styles.profitPctRow}>
                <Ionicons
                  name={(stats.todayProfit || 0) >= 0 ? 'caret-up' : 'caret-down'}
                  size={12}
                  color={
                    (stats.todayProfit || 0) >= 0
                      ? colors.success
                      : colors.danger
                  }
                />
                <Text
                  style={[
                    styles.profitPct,
                    {
                      color:
                        (stats.todayProfit || 0) >= 0
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {(stats.todayProfitPct || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.profitSub}>
                Cost {formatCurrency(stats.todayCost || 0)}
              </Text>
            </View>

            <View style={styles.vDivider} />

            <View style={styles.profitItem}>
              <Text style={styles.profitLabel}>This month</Text>
              <Text style={styles.profitValue}>
                {formatCurrency(stats.monthProfit || 0)}
              </Text>
              <View style={styles.profitPctRow}>
                <Ionicons
                  name={(stats.monthProfit || 0) >= 0 ? 'caret-up' : 'caret-down'}
                  size={12}
                  color={
                    (stats.monthProfit || 0) >= 0
                      ? colors.success
                      : colors.danger
                  }
                />
                <Text
                  style={[
                    styles.profitPct,
                    {
                      color:
                        (stats.monthProfit || 0) >= 0
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {(stats.monthProfitPct || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.profitSub}>
                Cost {formatCurrency(stats.monthCost || 0)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.profitHidden}>
            Tap to reveal today and this month's profit with margin %
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.statGrid}>
        <StatCard
          label="Products"
          value={String(stats.totalProducts)}
          sub={`Worth ${formatCurrency(stats.totalStockValue)}`}
          icon="cube-outline"
          tint={{ bg: colors.brandLight, fg: colors.brand }}
        />
        <StatCard
          label="Low Stock"
          value={String(stats.lowStockCount)}
          sub={stats.lowStockCount > 0 ? 'Needs attention' : 'All good'}
          icon="warning-outline"
          tint={{
            bg: stats.lowStockCount > 0 ? colors.dangerBg : colors.successBg,
            fg: stats.lowStockCount > 0 ? colors.danger : colors.success,
          }}
        />
        <StatCard
          label="Bills this month"
          value={String(stats.monthBillCount)}
          icon="receipt-outline"
          tint={{ bg: colors.accentBg, fg: colors.accent }}
        />
        <StatCard
          label="Avg. bill"
          value={formatCurrency(
            stats.monthBillCount > 0
              ? stats.monthRevenue / stats.monthBillCount
              : 0
          )}
          icon="trending-up-outline"
          tint={{ bg: colors.successBg, fg: colors.success }}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Sales · Last 7 Days</Text>
        {chartData ? (
          <LineChart
            data={chartData}
            width={chartWidth}
            height={220}
            withInnerLines={false}
            withShadow={false}
            fromZero
            chartConfig={{
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (o = 1) => `rgba(37, 99, 235, ${o})`,
              labelColor: () => colors.textMuted,
              propsForDots: { r: '4', strokeWidth: '2', stroke: colors.brand },
              propsForBackgroundLines: { stroke: colors.borderLight },
            }}
            bezier
            style={{ marginTop: 8, borderRadius: 12, marginLeft: -14 }}
          />
        ) : (
          <Text style={styles.empty}>No sales in the last 7 days</Text>
        )}
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Low Stock Products</Text>
          <TouchableOpacity onPress={() => router.push('/alerts')}>
            <Text style={styles.link}>View all</Text>
          </TouchableOpacity>
        </View>
        {stats.lowStockProducts.length === 0 ? (
          <Text style={styles.empty}>No low-stock items.</Text>
        ) : (
          stats.lowStockProducts.map((p, idx) => (
            <View
              key={p._id}
              style={[
                styles.row,
                idx === stats.lowStockProducts.length - 1 && {
                  borderBottomWidth: 0,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.name}</Text>
                <Text style={styles.rowSub}>{p.sku}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.lowStock}>
                  {p.stock} {p.unit}
                </Text>
                <Text style={styles.rowSub}>alert at {p.lowStockAlert}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Recent Bills</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.link}>View all</Text>
          </TouchableOpacity>
        </View>
        {stats.recentBills.length === 0 ? (
          <Text style={styles.empty}>No bills yet.</Text>
        ) : (
          stats.recentBills.map((b, idx) => (
            <TouchableOpacity
              key={b._id}
              style={[
                styles.row,
                idx === stats.recentBills.length - 1 && {
                  borderBottomWidth: 0,
                },
              ]}
              onPress={() => router.push(`/bill/${b._id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{b.billNumber}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {b.customerName} · {formatDate(b.createdAt)}
                </Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(b.totalAmount)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
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
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.brand,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  heroRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  heroItem: { flex: 1 },
  heroItemLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  heroItemValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
  heroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  // Stock-in card
  stockInCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  stockInHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockInIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockInTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  stockInMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  stockInRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  stockInItem: { flex: 1 },
  stockInLabel: { color: colors.textMuted, fontSize: 11 },
  stockInValue: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    marginTop: 4,
  },
  stockInSub: { color: colors.textLight, fontSize: 11, marginTop: 2 },
  vDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 10,
    alignSelf: 'stretch',
  },
  // Profit card
  profitCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  profitHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profitIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profitTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  eyeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  eyeText: { fontSize: 11, fontWeight: '700' },
  profitHidden: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  profitBody: { flexDirection: 'row', marginTop: 14, alignItems: 'flex-start' },
  profitItem: { flex: 1 },
  profitLabel: { color: colors.textMuted, fontSize: 11 },
  profitValue: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 20,
    marginTop: 4,
  },
  profitPctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  profitPct: { fontSize: 13, fontWeight: '700' },
  profitSub: { color: colors.textLight, fontSize: 11, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  statSub: { color: colors.textLight, fontSize: 11, marginTop: 2 },
  block: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 14,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  link: { color: colors.brand, fontWeight: '600', fontSize: 12 },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 14,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowTitle: { fontWeight: '600', color: colors.text, fontSize: 14 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  lowStock: { color: colors.danger, fontWeight: '700' },
  amount: { fontWeight: '700', color: colors.text },
});
