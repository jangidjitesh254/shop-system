import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BillsList from '../../src/features/BillsList';
import TransactionsList from '../../src/features/TransactionsList';
import { colors } from '../../src/theme/colors';

const TABS = [
  { key: 'bills', label: 'Bills', icon: 'receipt-outline' },
  { key: 'txns', label: 'Movements', icon: 'swap-vertical-outline' },
];

export default function History() {
  const [tab, setTab] = useState('bills');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.switch}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.switchBtn, active && styles.switchBtnActive]}
              activeOpacity={0.85}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={active ? '#fff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.switchText,
                  { color: active ? '#fff' : colors.textMuted },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'bills' ? <BillsList /> : <TransactionsList />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchBtnActive: { backgroundColor: colors.brand },
  switchText: { fontWeight: '700', fontSize: 13 },
});
