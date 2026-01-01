import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootLayoutNav() {
  const { user, userProfile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/auth/login');
    } else if (user && !userProfile?.setupCompleted && segments[1] !== 'setup') {
      // Logged in but setup not completed
      router.replace('/auth/setup');
    } else if (user && userProfile?.setupCompleted && inAuthGroup) {
      // Logged in and setup completed, redirect to tabs
      router.replace('/(tabs)');
    }
  }, [user, userProfile, segments, loading]);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/setup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="expenses/add" options={{ presentation: 'modal', title: 'Harcama Ekle' }} />
      <Stack.Screen name="expenses/list" options={{ title: 'Tüm Harcamalar' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
