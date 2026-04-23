import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 6);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: colors.text, fontSize: 16 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: 56 + bottomInset,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: '#fff',
        },
        tabBarIcon: ({ color, focused }) => {
          const map = {
            index: focused ? 'grid' : 'grid-outline',
            shopkeepers: focused ? 'people' : 'people-outline',
          };
          const name = map[route.name];
          if (!name) return null;
          return <Ionicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Admin Overview' }}
      />
      <Tabs.Screen
        name="shopkeepers"
        options={{ title: 'Shopkeepers' }}
      />
      <Tabs.Screen name="shopkeeper/[id]" options={{ href: null }} />
    </Tabs>
  );
}
