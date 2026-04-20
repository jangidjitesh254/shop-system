import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

function ScanTabButton({ onPress }) {
  return (
    <View style={scanStyles.wrap} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={scanStyles.btn}>
        <Ionicons name="scan-outline" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
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
            index: focused ? 'home' : 'home-outline',
            stock: focused ? 'cube' : 'cube-outline',
            alerts: focused ? 'notifications' : 'notifications-outline',
            history: focused ? 'time' : 'time-outline',
          };
          const name = map[route.name];
          if (!name) return null;
          return <Ionicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ headerShown: false, title: 'Home' }}
      />
      <Tabs.Screen
        name="stock"
        options={{ title: 'Products' }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <ScanTabButton onPress={() => router.push('/scanner')} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/scanner');
          },
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts' }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History' }}
      />
    </Tabs>
  );
}

const scanStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#fff',
  },
});
