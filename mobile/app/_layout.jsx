import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

function RootNav() {
  const { user, booting } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (booting) return;
    const first = segments[0];
    const inAuth = first === 'login' || first === 'register';
    const inAdmin = first === 'admin';
    const isAdmin = user?.role === 'admin';

    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace(isAdmin ? '/admin' : '/');
    } else if (user && isAdmin && !inAdmin) {
      // Admin is never supposed to be inside the shopkeeper UI
      router.replace('/admin');
    } else if (user && !isAdmin && inAdmin) {
      router.replace('/');
    }
  }, [user, booting, segments]);

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: { fontWeight: '700', color: colors.text, fontSize: 16 },
        headerTintColor: colors.brand,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard & Analytics' }} />
      <Stack.Screen name="scanner" options={{ title: 'Scan to Sell' }} />
      <Stack.Screen name="billing" options={{ title: 'New Bill' }} />
      <Stack.Screen name="stock-in" options={{ title: 'Stock In' }} />
      <Stack.Screen name="product-form" options={{ title: 'Product' }} />
      <Stack.Screen name="bill/[id]" options={{ title: 'Invoice' }} />
      <Stack.Screen name="credit" options={{ title: 'Udhaar (Credit)' }} />
      <Stack.Screen name="credit/[name]" options={{ title: 'Customer' }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNav />
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
