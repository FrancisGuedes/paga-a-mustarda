// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, SplashScreen, useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FriendProvider } from '../context/FriendContext';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Ignorar avisos comuns (opcional, mas útil durante o desenvolvimento)
LogBox.ignoreLogs([
  "AsyncStorage has been extracted from react-native core",
  "Setting a timer for a long period of time",
  "EventEmitter.removeListener",
]);
LogBox.ignoreLogs([/AsyncStorage/]); // Ignora todos os avisos contendo AsyncStorage

// Impede que o ecrã de splash desapareça automaticamente antes de termos o estado de autenticação
SplashScreen.preventAutoHideAsync();

function ProtectedNavigation() {
  const { auth } = useAuth();
  const segments = useSegments(); // segmentos da rota atual a partir da raiz de 'app'
  const router = useRouter();

  useEffect(() => {
    console.log("[ProtectedNavigation] Auth state changed: ", auth.user ? auth.user.id : 'null', "isLoading:", auth.isLoading);
    console.log("[ProtectedNavigation] Current segments: ", segments);

    if (auth.isLoading) {
      console.log("[ProtectedNavigation] Auth is loading, returning null (SplashScreen is active).");
      return; // SplashScreen está ativo
    }

    SplashScreen.hideAsync().catch(error => console.warn("[ProtectedNavigation] Erro ao esconder SplashScreen:", error));

    const inAuthPages = segments[0] === '(auth)'; // Estamos no grupo de autenticação?

    if (!auth.user && !inAuthPages) {
      // Se não há utilizador e NÃO estamos no grupo (auth), redireciona para login
      console.log("[ProtectedNavigation] No user, not in auth pages. Redirecting to login.");
      router.replace('/(auth)/login');
    } else if (auth.user && inAuthPages) {
      // Se há utilizador e estamos no grupo (auth) (ex: acabou de fazer login), redireciona para tabs
      console.log("[ProtectedNavigation] User exists, and in auth pages. Redirecting to tabs.");
      router.replace('/(tabs)');
    } else {
      console.log("[ProtectedNavigation] Navigation state is stable or handled by current route.");
    }
  }, [auth.isLoading, auth.user, segments, router]);

  if (auth.isLoading) {
    // Mostra um loading enquanto o estado de autenticação é determinado
    // O SplashScreen deve cobrir isto, mas é um fallback.
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA000" />
      </View>
    );
  }

  // Se autenticado, ou no fluxo de autenticação, o Stack abaixo define as rotas.
  // A lógica de redirecionamento no useEffect já tratou de nos colocar no caminho certo.
  return (
    <Stack screenOptions={{ headerShown: false /* Oculta headers por defeito para a Stack raiz */ }}>
      <Stack.Screen name="(tabs)" /> {/* O (tabs) tem o seu próprio _layout.tsx para definir as Tabs */}
      <Stack.Screen name="(auth)/login" /> {/* O (auth) tem o seu próprio _layout.tsx para a stack de auth */}
      
      <Stack.Screen 
        name="select-split-type" // app/select-split-type.tsx
        options={{ 
          presentation: 'modal',
          // title: 'Como foi pago?',
          // headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="select-date" 
        options={{ 
          presentation: 'modal' 
        }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider> 
        <AuthProvider>
          <FriendProvider>
            <ProtectedNavigation />
          </FriendProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff', // Ou a cor de fundo do seu tema
    },
});