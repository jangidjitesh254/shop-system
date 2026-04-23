import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { Input, Label } from './ui';
import { colors } from '../theme/colors';

/**
 * Credit/Udhaar input block with stable autocomplete.
 *
 * - Fetches full list ONCE on mount (no per-keystroke network calls)
 * - Filters locally as user types (no re-renders that dismiss the keyboard)
 * - Suggestions dropdown is absolutely positioned so layout doesn't shift
 *   while the user types (which was dismissing the keyboard on Android)
 */
export default function CreditBlock({
  customer,
  onCustomerChange,
  creditDays,
  onCreditDaysChange,
  reminderDays,
  onReminderDaysChange,
}) {
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get('/credit/suggestions')
      .then(({ data }) => {
        if (mounted) setAllCustomers(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = (customer.name || '').trim().toLowerCase();
    const list = allCustomers;
    if (!q) return list.slice(0, 5);
    return list
      .filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.phone || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [customer.name, allCustomers]);

  // Only hide dropdown if user typed an exact match
  const exactMatch = filtered.some(
    (s) => (s.name || '').toLowerCase() === (customer.name || '').trim().toLowerCase()
  );
  const showSuggestions = focused && filtered.length > 0 && !exactMatch;

  const pickSuggestion = (s) => {
    onCustomerChange({ name: s.name, phone: s.phone || customer.phone });
    setFocused(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={18} color={colors.warning} />
        <Text style={styles.title}>Udhaar (Credit Purchase)</Text>
      </View>
      <Text style={styles.hint}>
        Amount will be added to the customer's credit account. A reminder will
        appear on Alerts before the due date.
      </Text>

      {/* Name input + absolute suggestions dropdown */}
      <View style={{ marginTop: 12 }}>
        <Label>Customer Name *</Label>
        <View style={styles.nameWrap}>
          <Input
            placeholder="Enter full name"
            value={customer.name}
            onChangeText={(v) => onCustomerChange({ name: v })}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
          />

          {showSuggestions && (
            <View style={styles.suggestions}>
              {loading && filtered.length === 0 ? (
                <View style={styles.sugRow}>
                  <ActivityIndicator size="small" color={colors.brand} />
                  <Text style={styles.sugMeta}>Loading…</Text>
                </View>
              ) : (
                filtered.map((s, i) => (
                  <TouchableOpacity
                    key={s.name}
                    style={[
                      styles.sugRow,
                      i === filtered.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPressIn={() => pickSuggestion(s)}
                    activeOpacity={0.65}
                  >
                    <View style={styles.sugAvatar}>
                      <Ionicons name="person" size={13} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sugName} numberOfLines={1}>
                        {s.name}
                      </Text>
                      {s.phone ? (
                        <Text style={styles.sugMeta}>{s.phone}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.sugMeta}>
                      {s.count} prev
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {allCustomers.length === 0 && !loading && (
          <Text style={styles.emptyHint}>
            No previous Udhaar customers yet. This is your first credit sale.
          </Text>
        )}
      </View>

      <Label style={{ marginTop: 12 }}>Phone (optional)</Label>
      <Input
        keyboardType="phone-pad"
        value={customer.phone}
        onChangeText={(v) => onCustomerChange({ phone: v })}
      />

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Label>Credit period (days)</Label>
          <Input
            keyboardType="number-pad"
            value={String(creditDays)}
            onChangeText={onCreditDaysChange}
            placeholder="7"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Label>Remind when (days left)</Label>
          <Input
            keyboardType="number-pad"
            value={String(reminderDays)}
            onChangeText={onReminderDaysChange}
            placeholder="2"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.warning, fontWeight: '800', fontSize: 13 },
  hint: { color: colors.text, fontSize: 12, marginTop: 4, lineHeight: 18 },
  nameWrap: {
    position: 'relative',
    // Ensure absolute child can render over following rows (Android)
    zIndex: 10,
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#0b1220',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    zIndex: 20,
  },
  sugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sugAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sugName: { fontWeight: '700', color: colors.text, fontSize: 13 },
  sugMeta: { color: colors.textMuted, fontSize: 11 },
  emptyHint: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  row2: { flexDirection: 'row', gap: 12, marginTop: 12 },
});
