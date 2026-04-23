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
import api from '../../src/api/axios';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';

export default function CreditDetail() {
  const { name } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settling, setSettling] = useState(null);

  const decodedName = decodeURIComponent(String(name || ''));

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(
        `/credit/customers/${encodeURIComponent(decodedName)}`
      );
      setBills(data);
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
      navigation.setOptions({ title: decodedName });
      load(true);
    }, [decodedName])
  );

  const settle = (bill) => {
    Alert.alert(
      'Mark as paid',
      `Mark bill ${bill.billNumber} (${formatCurrency(bill.totalAmount)}) as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          style: 'default',
          onPress: async () => {
            setSettling(bill._id);
            try {
              await api.post(`/credit/bills/${bill._id}/settle`);
              Toast.show({ type: 'success', text1: 'Payment recorded' });
              load(true);
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Could not settle',
                text2: err.response?.data?.message || err.message,
              });
            } finally {
              setSettling(null);
            }
          },
        },
      ]
    );
  };

  const outstanding = bills
    .filter((b) => b.paymentStatus === 'unpaid')
    .reduce((s, b) => s + b.totalAmount, 0);
  const paid = bills
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((s, b) => s + b.totalAmount, 0);
  const phone = bills.find((b) => b.customerPhone)?.customerPhone || '';

  if (loading && bills.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

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
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {decodedName[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{decodedName}</Text>
        {phone ? <Text style={styles.phone}>{phone}</Text> : null}
        <View style={styles.heroStats}>
          <View style={styles.heroItem}>
            <Text style={styles.heroItemLabel}>Outstanding</Text>
            <Text style={[styles.heroItemValue, { color: colors.danger }]}>
              {formatCurrency(outstanding)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.heroItem}>
            <Text style={styles.heroItemLabel}>Total paid</Text>
            <Text style={[styles.heroItemValue, { color: colors.success }]}>
              {formatCurrency(paid)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.section}>All credit bills</Text>
      {bills.length === 0 ? (
        <Text style={styles.empty}>No credit bills for this customer.</Text>
      ) : (
        bills.map((b) => {
          const unpaid = b.paymentStatus === 'unpaid';
          const due = b.creditDueDate ? new Date(b.creditDueDate) : null;
          const overdue = due && due.getTime() < Date.now();
          return (
            <View key={b._id} style={styles.bill}>
              <TouchableOpacity
                style={styles.billTop}
                onPress={() => router.push(`/bill/${b._id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.billIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={18}
                    color={colors.brand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billNumber}>{b.billNumber}</Text>
                  <Text style={styles.billMeta}>
                    {formatDate(b.createdAt)} · {b.items.length} item
                    {b.items.length !== 1 ? 's' : ''}
                  </Text>
                  {unpaid && due ? (
                    <Text
                      style={[
                        styles.billDue,
                        { color: overdue ? colors.danger : colors.warning },
                      ]}
                    >
                      {overdue
                        ? `Overdue since ${formatDate(due)}`
                        : `Due ${formatDate(due)}`}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.billAmount}>
                    {formatCurrency(b.totalAmount)}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: unpaid
                          ? colors.dangerBg
                          : colors.successBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: unpaid ? colors.danger : colors.success,
                        },
                      ]}
                    >
                      {unpaid ? 'UNPAID' : 'PAID'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {unpaid && (
                <TouchableOpacity
                  style={styles.settleBtn}
                  disabled={settling === b._id}
                  onPress={() => settle(b)}
                  activeOpacity={0.85}
                >
                  {settling === b._id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.settleText}>
                        Mark as paid
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
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
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.warning, fontWeight: '800', fontSize: 24 },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  phone: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  heroStats: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  heroItem: { flex: 1, alignItems: 'center' },
  heroItemLabel: { color: colors.textMuted, fontSize: 11 },
  heroItemValue: { fontWeight: '800', fontSize: 16, marginTop: 2 },
  divider: { width: 1, height: '100%', backgroundColor: colors.borderLight },
  section: {
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: 20,
    fontSize: 13,
  },
  bill: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  billTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billNumber: { color: colors.text, fontWeight: '700' },
  billMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  billDue: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  billAmount: { fontWeight: '800', color: colors.text, fontSize: 15 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.success,
  },
  settleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
