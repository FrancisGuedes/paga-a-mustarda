// src/features/auth/screens/LoginScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform, // Using Alert for simplicity instead of toast/sonner
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
// Assuming your AuthContext is adapted for React Native
import { useAuth } from '../../../context/AuthContext';
// TEMP: Mock useAuth for demonstration if AuthContext is missing
import { AntDesign, Ionicons } from '@expo/vector-icons';

// Define your AuthStackParamList if you haven't already (e.g., in your navigation types file)
// This is an example, adjust it to your actual navigation setup
type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
  // Add other auth-related screens here
};

// Define the navigation prop type for this screen
type LoginScreenNavigationProp = NativeStackNavigationProp<
    AuthStackParamList,
    'Login'
>;

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { auth, login, loginWithGoogle } = useAuth(); // Use your actual adapted useAuth hook
    const navigation = useNavigation<LoginScreenNavigationProp>();

    const handleLogin = async () => {
        // Basic validation
        if (!email.trim() || !password.trim()) {
            Alert.alert('Campos em Falta', 'Por favor, preencha o email e a password.');
            return;
        }
        try {
            await login(email, password);
            // Navigation on successful login would typically be handled by a listener
            // on the auth state in your App.tsx or main navigator.
        } catch (error) {
            // Error is typically handled within the login function of useAuth
            console.log('Login failed in component:', error);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.log('Google login failed in component:', error);
        }
    }

    return (
        <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
        >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Header would typically be part of React Navigation options */}
            {/* <Text style={styles.headerTitle}>Login</Text> */}

            <View style={styles.container}>
            <View style={styles.innerContainer}>
                <View style={styles.textCenter}>
                <Text style={styles.title}>Bem-vindo de volta</Text>
                <Text style={styles.subtitle}>Faça login na sua conta</Text>
                </View>

                <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                    style={styles.input}
                    placeholder="email@exemplo.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    testID="loginEmailInput"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    testID="loginPasswordInput"
                    />
                </View>
                </View>

                {auth.error && (
                <Text style={styles.errorText}>
                    {String(auth.error)}
                </Text>
                )}

                <TouchableOpacity
                    style={[styles.button, styles.signInButton, auth.isLoading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={auth.isLoading}
                    testID="loginButton"
                >
                {auth.isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                    <Text style={styles.buttonText}>Entrar</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" style={styles.buttonIconRight} />
                    </>
                )}
                </TouchableOpacity>
            </View>

            <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Ou continue com</Text>
                <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
                style={[styles.button, styles.googleButton, auth.isLoading && styles.buttonDisabled]}
                onPress={handleGoogleLogin} // Use the new handler
                disabled={auth.isLoading}
            >
                <AntDesign name="google" size={20} color="#DB4437" style={styles.buttonIconLeft} />
                <Text style={[styles.buttonText, styles.googleButtonText]}>Entrar com Google</Text>
            </TouchableOpacity>

            <View style={styles.footerTextContainer}>
                <Text style={styles.footerText}>Não tem uma conta? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.footerText, styles.linkText]}>Registe-se</Text>
                </TouchableOpacity>
            </View>
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center', // Centraliza o conteúdo se for menor que a tela
        backgroundColor: '#f0f2f5', // Um cinza claro para o fundo da tela
    },
    // headerTitle: { // Se você quiser um título manual
    //   fontSize: 24,
    //   fontWeight: 'bold',
    //   textAlign: 'center',
    //   paddingVertical: 20,
    //   backgroundColor: 'white', // Exemplo
    // },
    container: {
        flex: 1, // Ocupa o espaço disponível
        justifyContent: 'center', // Centraliza verticalmente
        alignItems: 'center', // Centraliza horizontalmente
        paddingHorizontal: 24, // px-6
        paddingVertical: 48, // py-12
    },
    innerContainer: {
        width: '100%',
        maxWidth: 400, // max-w-md (aproximado)
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24, // Espaçamento interno
        shadowColor: "#000",
        shadowOffset: {
        width: 0,
        height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    textCenter: {
        alignItems: 'center',
        marginBottom: 32, // space-y-8 (aproximado para o container de texto)
    },
    title: {
        fontSize: 26, // text-2xl
        fontWeight: 'bold',
        // fontFamily: 'System', // Adicione sua fonte aqui
        color: '#1f2937', // Um cinza escuro
    },
    subtitle: {
        marginTop: 8, // mt-2
        fontSize: 15, // text-sm
        color: '#6b7280', // text-muted-foreground (aproximado)
    },
    formContainer: {
        marginTop: 0, // mt-8 (já tem margin no textCenter)
        // space-y-6 (cada inputGroup terá marginBottom)
    },
    inputGroup: {
        marginBottom: 20, // space-y-4 (aproximado)
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151', // Um cinza mais escuro para labels
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderColor: '#d1d5db', // border-border (aproximado)
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    errorText: {
        fontSize: 14,
        color: '#ef4444', // text-red-500
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 24, // mt-8 (para o primeiro botão)
        width: '100%', // w-full
    },
    signInButton: {
        backgroundColor: '#fb923c', // Um laranja (mustarda!)
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonIconRight: {
        marginLeft: 8,
    },
    buttonIconLeft: {
        marginRight: 10,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32, // relative mt-6
        marginBottom: 24,
        width: '100%',
        maxWidth: 400,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb', // border-border (aproximado)
    },
    dividerText: {
        marginHorizontal: 12, // px-2
        fontSize: 12, // text-xs
        textTransform: 'uppercase',
        color: '#6b7280', // text-muted-foreground
    },
    googleButton: {
        backgroundColor: '#fff', // variant="outline"
        borderColor: '#d1d5db', // border-border
        borderWidth: 1,
        marginTop: 0, // mt-4 (já tem margin no dividerContainer)
    },
    googleButtonText: {
        color: '#374151', // Cor de texto para botão outline
    },
    footerTextContainer: {
        marginTop: 32, // mt-6
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14, // text-sm
        color: '#6b7280', // text-muted-foreground
    },
    linkText: {
        fontWeight: '500', // font-medium
        color: '#fb923c', // text-primary (cor mostarda)
        // textDecorationLine: 'underline', // hover:underline (underline é padrão em links de texto)
    },
});