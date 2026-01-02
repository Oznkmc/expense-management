import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/setup" options={{ headerShown: false }} />
            <Stack.Screen name="expenses/add" options={{
              presentation: 'modal',
              headerShown: false
            }} />
            <Stack.Screen name="expenses/list" options={{
              presentation: 'card',
              headerShown: false
            }} />
            <Stack.Screen name="incomes/add" options={{
              presentation: 'modal',
              headerShown: false
            }} />
            <Stack.Screen name="incomes/list" options={{
              presentation: 'card',
              headerShown: false
            }} />
            <Stack.Screen name="budgets/categories" options={{
              presentation: 'card',
              headerShown: false
            }} />
            <Stack.Screen name="recurring/list" options={{
              presentation: 'card',
              headerShown: false
            }} />
            <Stack.Screen name="tags/manage" options={{
              presentation: 'card',
              headerShown: false
            }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
