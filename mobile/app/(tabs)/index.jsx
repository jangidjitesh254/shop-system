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
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import api from '../../src/api/axios';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';

const QuickAction = ({ icon, label, onPress, tint }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.action}>
    <View style={[styles.actionIcon, { backgroundColor: tint.bg }]}>
      <Ionicons name={icon} size={24} color={tint.fg} />
    </View>
    <Text style={styles.actionLabel} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/bills');
      setRecent(data.slice(0, 5));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not load recent activity',
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Welcome back</Text>
            <Text style={styles.shopName} numberOfLines={1}>
              {user?.shopName || 'Your Shop'}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/dashboard')}
          style={styles.dashboardCard}
        >
          <View style={styles.dashboardIcon}>
            <Ionicons name="stats-chart" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardTitle}>Dashboard & Analytics</Text>
            <Text style={styles.dashboardSub}>
              Revenue, charts, top products, full performance
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="scan-outline"
            label="Scan & Sell"
            onPress={() => router.push('/scanner')}
            tint={{ bg: colors.brandLight, fg: colors.brand }}
          />
          <QuickAction
            icon="receipt-outline"
            label="New Bill"
            onPress={() => router.push('/billing')}
            tint={{ bg: colors.successBg, fg: colors.success }}
          />
          <QuickAction
            icon="add-circle-outline"
            label="Add Product"
            onPress={() => router.push('/product-form')}
            tint={{ bg: colors.warningBg, fg: colors.warning }}
          />
          <QuickAction
            icon="arrow-down-circle-outline"
            label="Stock In"
            onPress={() => router.push('/stock-in')}
            tint={{ bg: colors.accentBg, fg: colors.accent }}
          />
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.link}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 24 }} />
          ) : recent.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <Ionicons name="document-outline" size={30} color={colors.textLight} />
              <Text style={styles.empty}>No bills yet</Text>
            </View>
          ) : (
            recent.map((b, idx) => (
              <TouchableOpacity
                key={b._id}
                style={[
                  styles.row,
                  idx === recent.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => router.push(`/bill/${b._id}`)}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="receipt-outline" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{b.billNumber}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {b.customerName} · {formatDate(b.createdAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  greet: { color: colors.textMuted, fontSize: 13 },
  shopName: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCard: {
    marginHorizontal: 16,
    backgroundColor: colors.brand,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  dashboardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dashboardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
  },
  action: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: colors.brand,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 22,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  recentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontWeight: '600', color: colors.text, fontSize: 14 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textMuted, marginTop: 8, fontSize: 13 },
});
