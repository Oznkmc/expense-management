import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Simüle font yükleme
    setLoaded(true);
    SplashScreen.hideAsync();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="auth/setup" options={{ headerShown: false }} />
          <Stack.Screen name="expenses/add" options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Harcama Ekle',
            headerBackTitle: 'Geri'
          }} />
          <Stack.Screen name="expenses/list" options={{
            presentation: 'card',
            headerShown: true,
            headerTitle: 'Harcama Listesi',
            headerBackTitle: 'Geri'
          }} />
          <Stack.Screen name="incomes/add" options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Gelir Ekle',
            headerBackTitle: 'Geri'
          }} />
          <Stack.Screen name="incomes/list" options={{
            presentation: 'card',
            headerShown: true,
            headerTitle: 'Gelirler Listesi',
            headerBackTitle: 'Geri'
          }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
