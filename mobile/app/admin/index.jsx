import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../src/api/axios';
import { useAuth } from '../../src/context/AuthContext';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';

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

export default function AdminOverview() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/admin/overview');
      setData(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load overview',
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

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger }}>No data</Text>
      </View>
    );
  }

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
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <View>
            <Text style={styles.heroLabel}>Platform Revenue · This month</Text>
            <Text style={styles.heroValue}>
              {formatCurrency(data.monthRevenue)}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={10}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.heroRow}>
          <View style={styles.heroItem}>
            <Text style={styles.heroItemLabel}>Bills this month</Text>
            <Text style={styles.heroItemValue}>{data.monthBillCount}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroItem}>
            <Text style={styles.heroItemLabel}>Today</Text>
            <Text style={styles.heroItemValue}>
              {formatCurrency(data.todayRevenue)}
            </Text>
          </View>
        </View>
        {user?.name ? (
          <Text style={styles.adminNote}>
            Signed in as admin · {user.name}
          </Text>
        ) : null}
      </View>

      {/* Stats */}
      <View style={styles.grid}>
        <StatCard
          label="Total shopkeepers"
          value={String(data.totalShopkeepers)}
          sub={`${data.activeShopkeepers} active`}
          icon="people-outline"
          tint={{ bg: colors.brandLight, fg: colors.brand }}
        />
        <StatCard
          label="Disabled"
          value={String(data.inactiveShopkeepers)}
          sub={data.inactiveShopkeepers > 0 ? 'Review' : 'All enabled'}
          icon="lock-closed-outline"
          tint={{
            bg: data.inactiveShopkeepers > 0 ? colors.dangerBg : colors.successBg,
            fg: data.inactiveShopkeepers > 0 ? colors.danger : colors.success,
          }}
        />
        <StatCard
          label="Products"
          value={String(data.totalProducts)}
          icon="cube-outline"
          tint={{ bg: colors.accentBg, fg: colors.accent }}
        />
        <StatCard
          label="Total bills"
          value={String(data.totalBills)}
          sub={`${data.todayBillCount} today`}
          icon="receipt-outline"
          tint={{ bg: colors.successBg, fg: colors.success }}
        />
      </View>

      {/* Top shops this month */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Top Shops · This Month</Text>
          <TouchableOpacity onPress={() => router.push('/admin/shopkeepers')}>
            <Text style={styles.link}>View all</Text>
          </TouchableOpacity>
        </View>
        {data.topShops.length === 0 ? (
          <Text style={styles.empty}>No sales this month yet.</Text>
        ) : (
          data.topShops.map((s, i) => (
            <TouchableOpacity
              key={String(s._id)}
              style={[
                styles.row,
                i === data.topShops.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/admin/shopkeeper/[id]',
                  params: { id: String(s._id) },
                })
              }
            >
              <View style={styles.rank}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{s.shopName}</Text>
                <Text style={styles.rowSub}>
                  {s.name} · {s.billCount} bill{s.billCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(s.revenue)}</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent signups */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Recent Signups</Text>
        </View>
        {data.recentSignups.length === 0 ? (
          <Text style={styles.empty}>No shopkeepers yet.</Text>
        ) : (
          data.recentSignups.map((u, i) => (
            <TouchableOpacity
              key={String(u._id)}
              style={[
                styles.row,
                i === data.recentSignups.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/admin/shopkeeper/[id]',
                  params: { id: String(u._id) },
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(u.name || '?')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{u.shopName}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {u.name} · {u.email}
                </Text>
                <Text style={styles.rowSub}>
                  Joined {formatDate(u.createdAt)}
                </Text>
              </View>
              {u.isActive === false && (
                <View style={styles.disabledPill}>
                  <Text style={styles.disabledText}>DISABLED</Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textLight}
              />
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
  heroHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  heroItemValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  adminNote: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
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
    fontSize: 22,
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
    gap: 10,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.brand, fontWeight: '800' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brand, fontWeight: '800' },
  rowTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '800', color: colors.text },
  disabledPill: {
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 4,
  },
  disabledText: { color: colors.danger, fontWeight: '800', fontSize: 10 },
});
