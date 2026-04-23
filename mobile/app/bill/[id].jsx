import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../src/api/axios';
import { useAuth } from '../../src/context/AuthContext';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';

export default function BillDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  const loadBill = async () => {
    try {
      const { data } = await api.get(`/bills/${id}`);
      setBill(data);
    } catch {
      Toast.show({ type: 'error', text1: 'Bill not found' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadBill();
  }, [id]);

  const onSettle = async () => {
    setSettling(true);
    try {
      await api.post(`/credit/bills/${id}/settle`);
      Toast.show({ type: 'success', text1: 'Marked as paid' });
      await loadBill();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not settle',
        text2: err.response?.data?.message || err.message,
      });
    } finally {
      setSettling(false);
    }
  };

  const onDelete = () =>
    Alert.alert('Delete bill', 'Delete this bill? Stock will be restored.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/bills/${id}`);
            Toast.show({ type: 'success', text1: 'Bill deleted' });
            router.back();
          } catch {
            Toast.show({ type: 'error', text1: 'Delete failed' });
          }
        },
      },
    ]);

  const onShare = async () => {
    if (!bill) return;
    const lines = [
      `${user?.shopName || 'Shop'}`,
      user?.shopAddress || '',
      user?.phone ? `Phone: ${user.phone}` : '',
      '',
      `INVOICE ${bill.billNumber}`,
      formatDate(bill.createdAt),
      '',
      `Bill To: ${bill.customerName}`,
      bill.customerPhone ? `Phone: ${bill.customerPhone}` : '',
      '',
      ...bill.items.map(
        (it, i) =>
          `${i + 1}. ${it.name} x${it.quantity} @ ${formatCurrency(
            it.pricePerUnit
          )} = ${formatCurrency(it.subtotal)}`
      ),
      '',
      `Subtotal: ${formatCurrency(bill.subtotal)}`,
      bill.taxAmount > 0
        ? `Tax (${bill.taxPercent}%): ${formatCurrency(bill.taxAmount)}`
        : '',
      bill.discount > 0 ? `Discount: -${formatCurrency(bill.discount)}` : '',
      `Total: ${formatCurrency(bill.totalAmount)}`,
      bill.paymentMethod === 'credit'
        ? `Payment: UDHAAR · ${bill.paymentStatus}${
            bill.paymentStatus === 'unpaid' && bill.creditDueDate
              ? ` · Due ${formatDate(bill.creditDueDate)}`
              : ''
          }`
        : `Payment: ${bill.paymentMethod} · ${bill.paymentStatus}`,
      '',
      'Thank you for your business!',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message: lines });
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }
  if (!bill) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger }}>Not found</Text>
      </View>
    );
  }

  const isCredit = bill.paymentMethod === 'credit';
  const isUnpaid = bill.paymentStatus === 'unpaid';
  const dueDate = bill.creditDueDate ? new Date(bill.creditDueDate) : null;
  const overdue = dueDate && dueDate.getTime() < Date.now();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {isCredit && isUnpaid && (
          <View
            style={[
              styles.creditBanner,
              overdue && {
                backgroundColor: colors.dangerBg,
                borderColor: colors.danger,
              },
            ]}
          >
            <Ionicons
              name={overdue ? 'alert-circle' : 'time-outline'}
              size={20}
              color={overdue ? colors.danger : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.creditBannerTitle,
                  { color: overdue ? colors.danger : colors.warning },
                ]}
              >
                {overdue ? 'OVERDUE' : 'UDHAAR — UNPAID'}
              </Text>
              {dueDate && (
                <Text style={styles.creditBannerSub}>
                  Due on {formatDate(dueDate)}
                </Text>
              )}
            </View>
          </View>
        )}
        {isCredit && !isUnpaid && (
          <View
            style={[
              styles.creditBanner,
              {
                backgroundColor: colors.successBg,
                borderColor: colors.success,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.creditBannerTitle, { color: colors.success }]}
              >
                UDHAAR — PAID
              </Text>
              {bill.creditPaidAt && (
                <Text style={styles.creditBannerSub}>
                  Settled on {formatDate(bill.creditPaidAt)}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.invoice}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>{user?.shopName}</Text>
              {user?.shopAddress && (
                <Text style={styles.small}>{user.shopAddress}</Text>
              )}
              {user?.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.small}>{user.phone}</Text>
                </View>
              )}
              {user?.email && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.small}>{user.email}</Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.invoiceTag}>INVOICE</Text>
              <Text style={styles.billNumber}>{bill.billNumber}</Text>
              <Text style={styles.small}>{formatDate(bill.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>BILL TO</Text>
          <Text style={styles.customerName}>{bill.customerName}</Text>
          {bill.customerPhone ? (
            <Text style={styles.small}>{bill.customerPhone}</Text>
          ) : null}

          <View style={[styles.divider, { marginTop: 14 }]} />

          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 3 }]}>ITEM</Text>
            <Text style={[styles.th, { width: 36, textAlign: 'center' }]}>QTY</Text>
            <Text style={[styles.th, { width: 78, textAlign: 'right' }]}>PRICE</Text>
            <Text style={[styles.th, { width: 88, textAlign: 'right' }]}>TOTAL</Text>
          </View>

          {bill.items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 3 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                {it.sku && <Text style={styles.small}>{it.sku}</Text>}
              </View>
              <Text style={{ width: 36, textAlign: 'center' }}>{it.quantity}</Text>
              <Text style={{ width: 78, textAlign: 'right' }}>
                {formatCurrency(it.pricePerUnit)}
              </Text>
              <Text style={{ width: 88, textAlign: 'right', fontWeight: '600' }}>
                {formatCurrency(it.subtotal)}
              </Text>
            </View>
          ))}

          <View style={[styles.divider, { marginTop: 6 }]} />

          <View>
            <TotalRow label="Subtotal" value={formatCurrency(bill.subtotal)} />
            {bill.taxAmount > 0 && (
              <TotalRow
                label={`Tax (${bill.taxPercent}%)`}
                value={formatCurrency(bill.taxAmount)}
              />
            )}
            {bill.discount > 0 && (
              <TotalRow
                label="Discount"
                value={`-${formatCurrency(bill.discount)}`}
              />
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>
                {formatCurrency(bill.totalAmount)}
              </Text>
            </View>
            <Text style={styles.payment}>
              Payment:{' '}
              <Text style={{ fontWeight: '700' }}>{bill.paymentMethod}</Text>
              {' · '}
              <Text style={{ fontWeight: '700' }}>{bill.paymentStatus}</Text>
            </Text>
          </View>

          <Text style={styles.thanks}>Thank you for your business!</Text>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        {isCredit && isUnpaid ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSettle]}
            onPress={onSettle}
            disabled={settling}
          >
            {settling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.actionText}>Mark as paid</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionShare]}
          onPress={onShare}
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDelete]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TotalRow = ({ label, value }) => (
  <View
    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
  >
    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
    <Text style={{ color: colors.text, fontSize: 13 }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  invoice: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  shopName: { fontSize: 20, fontWeight: '800', color: colors.brand },
  small: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  invoiceTag: { fontWeight: '800', fontSize: 16, color: colors.text },
  billNumber: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  sectionLabel: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  customerName: { fontWeight: '700', marginTop: 3, color: colors.text },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemName: { color: colors.text, fontWeight: '600' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandLabel: { fontSize: 17, fontWeight: '800' },
  grandValue: { fontSize: 19, fontWeight: '800', color: colors.brand },
  payment: {
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  thanks: { textAlign: 'center', color: colors.textMuted, marginTop: 18 },
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
  actionShare: { backgroundColor: colors.brand },
  actionDelete: { backgroundColor: colors.danger },
  actionSettle: { backgroundColor: colors.success },
  actionText: { color: '#fff', fontWeight: '700' },
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
    marginBottom: 12,
  },
  creditBannerTitle: { fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  creditBannerSub: { color: colors.text, fontSize: 12, marginTop: 2 },
});
