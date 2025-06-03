// features/auth/screens/RegisterScreen.tsx
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<
    AuthStackParamList,
    "Register"
>;

export default function RegisterScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState(''); // Novo estado para o nome


    const [confirmPassword, setConfirmPassword] = useState("");
    const { auth, register } = useAuth();
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const router = useRouter();

    const handleRegister = async () => {
        if (!email.trim() || !password.trim() || !confirmPassword.trim() || !name.trim()) {
            Alert.alert("Campos em Falta", "Por favor, preencha todos os campos.");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Erro", "As passwords não coincidem.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Erro", "A password deve ter pelo menos 6 caracteres.");
            return;
        }

        try {
            await register(email, password, name);
        } catch (error) {
            console.log("Register failed in component:", error);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingContainer}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <View style={styles.innerContainer}>
                <View style={styles.textCenter}>
                    <Text style={styles.title}>Criar Conta</Text>
                    <Text style={styles.subtitle}>
                    Registe-se para começar a dividir despesas
                    </Text>
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
                        testID="registerEmailInput"
                    />
                    </View>

                    <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome</Text>
                    <TextInput
                    style={styles.input}
                    placeholder="O seu nome completo"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    testID="registerNameInput"
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
                        testID="registerPasswordInput"
                    />
                    </View>

                    <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        testID="registerConfirmPasswordInput"
                    />
                    </View>
                </View>

                {auth.error && (
                    <Text style={styles.errorText}>{String(auth.error)}</Text>
                )}

                <TouchableOpacity
                    style={[
                    styles.button,
                    styles.registerButton,
                    auth.isLoading && styles.buttonDisabled,
                    ]}
                    onPress={handleRegister}
                    disabled={auth.isLoading}
                    testID="registerButton"
                >
                    {auth.isLoading ? (
                    <ActivityIndicator color="#fff" />
                    ) : (
                    <>
                        <Text style={styles.buttonText}>Registar</Text>
                        <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="white"
                        style={styles.buttonIconRight}
                        />
                    </>
                    )}
                </TouchableOpacity>

                <View style={styles.footerTextContainer}>
                    <Text style={styles.footerText}>Já tem uma conta? </Text>
                    <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                    <Text style={[styles.footerText, styles.linkText]}>
                        Faça login
                    </Text>
                    </TouchableOpacity>
                </View>
                </View>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
    );
}

// Use os mesmos styles do LoginScreen
const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
        flex: 1,
    },
    registerButton: {
        backgroundColor: "#fb923c",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center', // Centraliza o conteúdo se for menor que a tela
        backgroundColor: '#f0f2f5', // Um cinza claro para o fundo da tela
    },
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
