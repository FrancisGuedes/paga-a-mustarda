// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../features/auth/screens/LoginScreen'; // Certifique-se de que o caminho está correto
// import RegisterScreen from '../features/auth/screens/RegisterScreen'; // Adicione quando tiver

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined; // Adicione quando tiver
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
        </Stack.Navigator>
    );
};

export default AuthNavigator;