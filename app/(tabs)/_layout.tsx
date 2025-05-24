import { Tabs, useRouter, useSegments, Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCurrentFriend } from '../../context/FriendContext'; 

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { currentFriend } = useCurrentFriend();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Amigos',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="add-expense"
        options={{
          title: 'Adicionar',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 10} color={color} />,
        }}
        listeners={{
            tabPress: e => {
              e.preventDefault();
              router.push('/add-expense');
            },
          }}
      /> */}
      <Tabs.Screen
        name="add-expense-entry" // Corresponde a app/(tabs)/add-expense-entry.tsx
        options={{
          title: 'Adicionar',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 10} color={color} />,
        }}
        listeners={{
            tabPress: e => {
              e.preventDefault(); // Impede a navegação para o ecrã "add-expense-entry"

              const currentScreenNameInTabs = segments[0]; // Ex: 'index', 'friend', 'groups'

              console.log('Tab Adicionar premida. Ecrã atual nas tabs:', currentScreenNameInTabs, "Amigo atual do contexto:", currentFriend);

              const currentFolderName = segments[0];
              const currentScreenName = segments[1]; // O nome do ficheiro/diretório da tab atual
              const potentialId = segments[2]; // O segundo segmento, se existir (ex: friendId)

              console.log('Tab Adicionar premida. Segmentos atuais dentro de (tabs):', segments);
              console.log('Diretorio da tab atual:', currentFolderName);
              console.log('Ecrã da tab atual (primeiro segmento):', currentScreenName);
              console.log(`A navegar para adicionar despesa para o POTENCIAL amigo: ${potentialId}`);

              if (currentFolderName === '(tabs)' && currentScreenName === 'friend' && potentialId === '[friendId]') {
                // Estamos no ecrã de despesas de um amigo específico
                const friendId = potentialId;
                console.log(`A navegar para adicionar despesa para o amigo: ${currentFriend?.name}`);

                router.push({
                  pathname: '/add-expense',
                  params: { 
                    friendId: currentFriend?.id,
                    friendName: currentFriend?.name,
                    friendAvatarUrl: currentFriend?.avatarUrl || undefined,
                  },
                });
              } else if (currentFolderName === '(tabs)' && currentScreenName ==='groups') {
                // Estamos no ecrã de grupos
                console.log('A navegar para criar grupo...');
                router.push('/groups'); // Crie esta rota app/create-group.tsx
              } else { // Inclui o caso de estar em 'index' (Amigos) ou outro ecrã de tab
                // Comportamento padrão: Navega para adicionar despesa sem amigo pré-selecionado
                console.log('A navegar para adicionar despesa genérica...');
                router.push('/add-expense');
              }
            },
          }}
      />
      <Tabs.Screen
        name="activity" 
        options={{
          title: 'Atividade',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friend/[friendId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-friend"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="add-expense" 
        options={{ 
          href: null 
        }} 
      />
    </Tabs>
  );
}
