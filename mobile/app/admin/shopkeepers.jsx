import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../src/api/axios';
import { Input } from '../../src/components/ui';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';

export default function Shopkeepers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/admin/shopkeepers', { params });
      setUsers(data);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load shopkeepers',
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

  const renderItem = ({ item: u }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.75}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.name} numberOfLines={1}>
            {u.shopName}
          </Text>
          {u.isActive === false && (
            <View style={styles.disabledPill}>
              <Text style={styles.disabledText}>DISABLED</Text>
            </View>
          )}
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {u.name} · {u.email}
        </Text>
        <Text style={styles.sub}>
          {u.billCount || 0} bill{(u.billCount || 0) !== 1 ? 's' : ''} ·{' '}
          {u.productCount || 0} products
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.revenue}>{formatCurrency(u.revenue || 0)}</Text>
        {u.lastBillAt ? (
          <Text style={styles.sub}>last {formatDate(u.lastBillAt)}</Text>
        ) : (
          <Text style={styles.sub}>no bills</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textLight}
            style={{ marginHorizontal: 10 }}
          />
          <Input
            placeholder="Search name, email, or shop…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {users.length} shopkeeper{users.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(i) => String(i._id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="people-outline"
                size={38}
                color={colors.textLight}
              />
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>
                No shopkeepers yet
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: { color: colors.textMuted, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brand, fontWeight: '800', fontSize: 18 },
  name: { fontWeight: '700', color: colors.text, fontSize: 14 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  revenue: { fontWeight: '800', color: colors.text, fontSize: 14 },
  disabledPill: {
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  disabledText: { color: colors.danger, fontWeight: '800', fontSize: 10 },
  emptyBox: { padding: 36, alignItems: 'center' },
});
