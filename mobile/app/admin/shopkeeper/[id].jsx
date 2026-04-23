import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/axios';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';

export default function ShopkeeperDetail() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/admin/shopkeepers/${id}`);
      setData(data);
      navigation.setOptions({ title: data.user?.shopName || 'Shopkeeper' });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load',
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
    }, [id])
  );

  const toggleActive = async () => {
    if (!data) return;
    const next = !(data.user.isActive !== false);
    setBusy(true);
    try {
      await api.patch(`/admin/shopkeepers/${id}`, { isActive: next });
      Toast.show({
        type: 'success',
        text1: next ? 'Enabled shopkeeper' : 'Disabled shopkeeper',
      });
      load(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: err.response?.data?.message || err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert(
      'Delete shopkeeper?',
      'This permanently removes this shopkeeper, their products, bills, and transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.delete(`/admin/shopkeepers/${id}`);
              Toast.show({ type: 'success', text1: 'Shopkeeper removed' });
              router.replace('/admin/shopkeepers');
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Delete failed',
                text2: err.response?.data?.message || err.message,
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ]
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
        <Text style={{ color: colors.danger }}>Not found</Text>
      </View>
    );
  }

  const u = data.user;
  const s = data.stats;
  const isActive = u.isActive !== false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
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
        {/* Hero profile */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(u.name || '?')[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.shopName}>{u.shopName}</Text>
          <Text style={styles.ownerName}>{u.name}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
            <Text style={styles.contact}>{u.email}</Text>
          </View>
          {u.phone ? (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={13} color={colors.textMuted} />
              <Text style={styles.contact}>{u.phone}</Text>
            </View>
          ) : null}
          {u.shopAddress ? (
            <View style={styles.contactRow}>
              <Ionicons
                name="location-outline"
                size={13}
                color={colors.textMuted}
              />
              <Text style={styles.contact}>{u.shopAddress}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Joined {formatDate(u.createdAt)}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isActive
                    ? colors.successBg
                    : colors.dangerBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isActive ? colors.success : colors.danger },
                ]}
              >
                {isActive ? 'ACTIVE' : 'DISABLED'}
              </Text>
            </View>
          </View>
          {u.lastLoginAt ? (
            <Text style={[styles.metaText, { marginTop: 2 }]}>
              Last login {formatDate(u.lastLoginAt)}
            </Text>
          ) : null}
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          <Stat
            label="Total revenue"
            value={formatCurrency(s.totalRevenue)}
            icon="cash-outline"
            tint={{ bg: colors.successBg, fg: colors.success }}
          />
          <Stat
            label="Month revenue"
            value={formatCurrency(s.monthRevenue)}
            icon="trending-up-outline"
            tint={{ bg: colors.brandLight, fg: colors.brand }}
          />
          <Stat
            label="Bills"
            value={String(s.billCount)}
            icon="receipt-outline"
            tint={{ bg: colors.accentBg, fg: colors.accent }}
          />
          <Stat
            label="Products"
            value={String(s.productCount)}
            sub={
              s.lowStockCount > 0
                ? `${s.lowStockCount} low stock`
                : 'All stocked'
            }
            icon="cube-outline"
            tint={{ bg: colors.infoBg, fg: colors.info }}
          />
          <Stat
            label="Udhaar unpaid"
            value={formatCurrency(s.creditOutstanding)}
            sub={`${s.creditUnpaidCount} bill${s.creditUnpaidCount !== 1 ? 's' : ''}`}
            icon="wallet-outline"
            tint={{ bg: colors.warningBg, fg: colors.warning }}
          />
        </View>

        {/* Low stock */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Low Stock</Text>
          {data.lowStockProducts.length === 0 ? (
            <Text style={styles.empty}>All items stocked.</Text>
          ) : (
            data.lowStockProducts.map((p, i) => (
              <View
                key={String(p._id)}
                style={[
                  styles.row,
                  i === data.lowStockProducts.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{p.name}</Text>
                  <Text style={styles.rowSub}>{p.sku}</Text>
                </View>
                <Text style={styles.lowStock}>
                  {p.stock} {p.unit}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Recent bills */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Recent Bills</Text>
          {data.recentBills.length === 0 ? (
            <Text style={styles.empty}>No bills yet.</Text>
          ) : (
            data.recentBills.map((b, i) => (
              <View
                key={String(b._id)}
                style={[
                  styles.row,
                  i === data.recentBills.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{b.billNumber}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {b.customerName} · {formatDate(b.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amount}>
                    {formatCurrency(b.totalAmount)}
                  </Text>
                  <Text style={[styles.rowSub, { textTransform: 'uppercase' }]}>
                    {b.paymentMethod}
                    {b.paymentStatus !== 'paid' ? ` · ${b.paymentStatus}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky admin action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: isActive ? colors.warning : colors.success },
          ]}
          onPress={toggleActive}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name={isActive ? 'lock-closed-outline' : 'lock-open-outline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.actionText}>
                {isActive ? 'Disable' : 'Enable'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.danger }]}
          onPress={remove}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Stat = ({ label, value, sub, icon, tint }) => (
  <View style={styles.stat}>
    <View style={styles.statTop}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.statIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={14} color={tint.fg} />
      </View>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brand, fontWeight: '800', fontSize: 28 },
  shopName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 10,
  },
  ownerName: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  contact: { color: colors.textMuted, fontSize: 12 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  metaText: { color: colors.textLight, fontSize: 11 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
  },
  statSub: { color: colors.textLight, fontSize: 11, marginTop: 2 },
  block: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 12,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  empty: {
    color: colors.textMuted,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 10,
  },
  rowName: { fontWeight: '700', color: colors.text, fontSize: 13 },
  rowSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  lowStock: { color: colors.danger, fontWeight: '800' },
  amount: { fontWeight: '800', color: colors.text, fontSize: 13 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: { color: '#fff', fontWeight: '700' },
});
