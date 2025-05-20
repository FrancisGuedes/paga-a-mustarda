import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
      <Tabs.Screen
        name="add-expense" // Crie app/(tabs)/add-expense.tsx
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size+10} color={color} />, // Ícone maior
        }}
        listeners={{
            tabPress: e => {
              e.preventDefault(); // Impede a navegação para este ecrã
              // Abra um modal ou execute uma ação aqui
              console.log("Botão Adicionar premido!");
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
    </Tabs>
  );
}
