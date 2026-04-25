import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from './ui';
import { formatCurrency } from '../utils/format';
import { colors } from '../theme/colors';

/**
 * Modal that lets the user enter a decimal quantity (e.g. 0.5 for 500g).
 * Shows the live subtotal so they can sanity-check the price.
 *
 * Props:
 *   visible
 *   item: { name, sku, unit, stock, pricePerUnit }
 *   initialValue: current qty (number)
 *   onSubmit: (newQty: number) => void
 *   onClose
 */
export default function QtyEditModal({
  visible,
  item,
  initialValue,
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(String(initialValue ?? 1));

  useEffect(() => {
    if (visible) setValue(String(initialValue ?? 1));
  }, [visible, initialValue]);

  if (!item) return null;

  const parsed = Number(value.replace(',', '.'));
  const valid = !Number.isNaN(parsed) && parsed > 0;
  const overStock = item.stock != null && parsed > item.stock;
  const subtotal = valid ? parsed * (item.pricePerUnit || 0) : 0;

  const apply = () => {
    if (!valid) return;
    if (overStock) return;
    onSubmit(parsed);
  };

  const presets = ['0.25', '0.5', '0.75', '1', '2', '5'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.cardWrap}
            >
              <View style={styles.card}>
                <View style={styles.head}>
                  <View style={styles.headIcon}>
                    <Ionicons name="create-outline" size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Edit quantity</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>
                  Quantity in {item.unit || 'units'} (decimals allowed)
                </Text>
                <Input
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={setValue}
                  autoFocus
                  selectTextOnFocus
                  placeholder="e.g. 0.5"
                />
                <Text style={styles.helper}>
                  Sold at {formatCurrency(item.pricePerUnit || 0)} per{' '}
                  {item.unit || 'unit'}
                </Text>

                <View style={styles.presetRow}>
                  {presets.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.preset,
                        value === p && {
                          backgroundColor: colors.brandLight,
                          borderColor: colors.brand,
                        },
                      ]}
                      onPress={() => setValue(p)}
                    >
                      <Text
                        style={{
                          color: value === p ? colors.brand : colors.textMuted,
                          fontWeight: '600',
                          fontSize: 12,
                        }}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.subtotalBox}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalValue}>
                    {formatCurrency(subtotal)}
                  </Text>
                </View>

                {overStock && (
                  <Text style={styles.error}>
                    Only {item.stock} {item.unit} in stock.
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={onClose}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Apply"
                    onPress={apply}
                    disabled={!valid || overStock}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  cardWrap: {},
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 14,
    marginBottom: 6,
  },
  helper: { color: colors.textLight, fontSize: 11, marginTop: 6 },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  preset: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  subtotalBox: {
    marginTop: 14,
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: { color: colors.textMuted, fontSize: 13 },
  subtotalValue: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '800',
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 6 },
});
