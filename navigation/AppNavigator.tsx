// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext'; // Certifique-se de que o caminho está correto
//import useAuth from '../features/auth/screens/LoginScreen';

// Ecrã de placeholder para quando o utilizador está logado
const HomeScreenPlaceholder = () => {
    const { logout, auth } = useAuth();
    return (
        <View style={styles.container}>
        <Text style={styles.text}>Bem-vindo à App!</Text>
        <Text style={styles.textSmall}>Utilizador: {auth.user?.email || 'Não identificado'}</Text>
        <Button title="Logout" onPress={logout} color="red" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 24,
        marginBottom: 20,
    },
    textSmall: {
        fontSize: 16,
        marginBottom: 20,
    }
});


export type AppStackParamList = {
    HomePlaceholder: undefined;
    // Adicione outros ecrãs da sua app aqui no futuro
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => {
    return (
        <Stack.Navigator>
        <Stack.Screen
            name="HomePlaceholder"
            component={HomeScreenPlaceholder}
            options={{ title: 'Paga A Mostarda' }}
        />
        {/* Adicione outros ecrãs da sua app aqui no futuro */}
        </Stack.Navigator>
    );
};

export default AppNavigator;