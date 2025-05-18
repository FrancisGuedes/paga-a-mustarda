// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext'; // Ajuste o caminho para o seu AuthContext
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { LogBox } from 'react-native'; // Para ignorar avisos

// Ignorar avisos comuns (opcional, mas útil durante o desenvolvimento)
LogBox.ignoreLogs([
  "AsyncStorage has been extracted from react-native core",
  "Setting a timer for a long period of time",
  "EventEmitter.removeListener",
]);
LogBox.ignoreLogs([/AsyncStorage/]); // Ignora todos os avisos contendo AsyncStorage

// Impede que o ecrã de splash desapareça automaticamente antes de termos o estado de autenticação
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { auth } = useAuth();
  const segments = useSegments(); // Obtém os segmentos da rota atual
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) {
      // Ainda a carregar, não fazemos nada, o SplashScreen está visível
      return;
    }

    // Quando o carregamento da autenticação terminar, escondemos o SplashScreen
    SplashScreen.hideAsync();

    const inAuthGroup = String(segments[0]) === '(auth)'; // Verifica se estamos no grupo de rotas de autenticação

    if (!auth.user && !inAuthGroup) {
      // Se não há utilizador e não estamos no fluxo de autenticação, redireciona para login
      router.replace('/(auth)/login'); // Ajuste o caminho para o seu ecrã de login no Expo Router
    } else if (auth.user && inAuthGroup) {
      // Se há utilizador e estamos no fluxo de autenticação (ex: veio do login),
      // redireciona para a página principal da app (ex: o grupo de tabs)
      router.replace('/(tabs)'); // Ajuste o caminho para o seu ecrã principal após login
    }
  }, [auth.isLoading, auth.user, segments, router]);

  if (auth.isLoading) {
    // Pode mostrar um ecrã de loading aqui se preferir em vez do SplashScreen,
    // mas o SplashScreen.preventAutoHideAsync() já trata disso.
    // Retornar null ou um ecrã de loading simples enquanto o SplashScreen está ativo.
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFA000" />
        </View>
    );
  }

  // O <Slot /> renderiza a rota atual correspondente baseada na navegação do Expo Router.
  // Se o utilizador não estiver autenticado e tentar aceder a uma rota protegida,
  // o useEffect acima irá redirecioná-lo.
  return <Slot />;
}

export default function RootLayout() {
  // O AuthProvider envolve toda a navegação para que o useAuth() funcione em todo o lado.
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
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