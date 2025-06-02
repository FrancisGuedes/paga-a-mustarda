// app/create-contact-manually.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Alert,
    ScrollView,
} from "react-native";
import { Stack, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

// Chave para passar o novo contacto de volta para AddFriendFlowScreen
export const NEWLY_CREATED_CONTACT_KEY = "paga_a_mostarda_newly_created_contact";

// Interface para o novo contacto
export type NewManualContact ={
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    contactType?: Contacts.ContactTypes.Person;
    imageAvailable?: boolean;
    image?: { uri: string };
}

interface ContactItem {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phoneNumbers?: Array<{ number?: string; label: string; id: string }>;
    imageAvailable?: boolean;
    image?: { uri: string };
}

export default function CreateContactManuallyScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState(""); // Agora um único campo para nome completo
    const [contactInfo, setContactInfo] = useState(""); // Para email ou telefone
    const [isSaving, setIsSaving] = useState(false);

    // O botão Guardar/Adicionar fica ativo se o nome estiver preenchido
    const canSave = name.trim() !== "";

    const handleSave = useCallback(async () => {
        if (!canSave) {
            Alert.alert("Campo em Falta", "Por favor, insira o nome do contacto.");
            return;
        }
        setIsSaving(true);

        // Tenta determinar se contactInfo é email ou telefone (simplificado)
        let emailAddress: string | undefined = undefined;
        let phoneNumberString: string | undefined = undefined;
        const REGEX_PHONE = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;

        if (contactInfo.includes("@")) {
            emailAddress = contactInfo.trim();
        } else if (contactInfo.match(REGEX_PHONE)) {
            // Heurística simples para telefone
            phoneNumberString = contactInfo.trim();
        } else if (contactInfo.trim() !== "") {
            // Se não for claramente um email ou telefone, pode decidir onde guardar
            // ou pedir ao utilizador para especificar. Por agora, podemos assumir que é um telefone se não for email.
            // Ou pode ter campos separados como antes. Para este layout, um campo combinado é usado.
            // Para este exemplo, se não for email, vamos assumir que é um telefone (ou pode deixar em branco)
            phoneNumberString = contactInfo.trim();
        }

        /* const newContact: NewManualContact = {
            name: name.trim(),
            firstName: name.trim().split(" ")[0] || name.trim(), // Pega no primeiro nome
            lastName: name.trim().split(" ").slice(1).join(" ") || undefined, // O resto como apelido
            email: emailAddress,
            phoneNumber: phoneNumberString,
            contactType: Contacts.ContactTypes.Person,
            imageAvailable: false,
        }; */

        const UUID = uuid.v4();

        const newContact: ContactItem = {
            id: UUID,
            name: name.trim(),
            firstName: name.trim().split(" ")[0] || name.trim(), // Pega no primeiro nome
            lastName: name.trim().split(" ").slice(1).join(" ") || undefined, // O resto como apelido
            email: emailAddress!,
            phoneNumbers: phoneNumberString ? [{ number: phoneNumberString, label: 'mobile', id: '1' }] : undefined,
            imageAvailable: false,
        };

        try {
            //await AsyncStorage.setItem(NEWLY_CREATED_CONTACT_KEY, JSON.stringify(newContact));
            await AsyncStorage.setItem(NEWLY_CREATED_CONTACT_KEY, JSON.stringify(newContact));
            console.log(
                "[CreateContactManually] Novo contacto guardado no AsyncStorage:",
                newContact
            );
            router.back();
        } catch (e) {
            console.error("Erro ao guardar novo contacto no AsyncStorage:", e);
            Alert.alert("Erro", "Não foi possível guardar o novo contacto.");
        } finally {
            setIsSaving(false);
        }
    }, [name, contactInfo, router, canSave]);

    useEffect(() => {
        navigation.setOptions({
            presentation: "modal",
            headerShown: true,
            title: "Adicionar novo contacto", // Título como na imagem
            headerTitleAlign: "center",
            headerLeft: () => (
                <TouchableOpacity
                onPress={() => router.back()}
                style={styles.headerButton}
                >
                <Text style={styles.headerButtonTextCancel}>Cancelar</Text>
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave || isSaving}
                style={styles.headerButton}
                >
                <Text
                    style={[
                    styles.headerButtonTextAdd,
                    (!canSave || isSaving) && styles.headerButtonDisabled,
                    ]}
                >
                    {isSaving ? "A adicionar..." : "Adicionar"}
                </Text>
                </TouchableOpacity>
            ),
            headerStyle: styles.headerStyle,
            headerShadowVisible: false, // Remove a sombra do header como na imagem
        });
    }, [navigation, router, handleSave, canSave, isSaving]);

    return (
        <ScrollView
        style={[styles.screenContainer, { paddingTop: insets.top }]} // paddingTop para o conteúdo abaixo do header
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        >
        {/* O Stack.Screen aqui é só para o Expo Router saber que este é um ecrã.
                As opções de header são definidas dinamicamente com navigation.setOptions. */}
        <Stack.Screen options={{ title: "Adicionar novo contacto" }} />

        <View style={styles.formContainer}>
            <View style={styles.inputFieldContainer}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#C7C7CC" // Placeholder menos proeminente
                autoCapitalize="words"
            />
            </View>

            <View style={styles.inputFieldContainer}>
            <Text style={styles.label}>
                Número de telefone ou endereço de e-mail
            </Text>
            <TextInput
                style={styles.input}
                value={contactInfo}
                onChangeText={setContactInfo}
                placeholderTextColor="#C7C7CC"
                keyboardType="email-address" // Permite @ e .
                autoCapitalize="none"
            />
            </View>

            <Text style={styles.infoText}>
            Não se preocupe, ainda nada foi adicionado. Terá outra oportunidade de
            rever antes do envio.
            </Text>
        </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF", // Fundo branco como na imagem
    },
    scrollContentContainer: {
        paddingTop: 20, // Espaço entre o header e o primeiro campo
        paddingHorizontal: 16,
    },
    formContainer: {
        // Sem margem horizontal aqui, os campos terão o seu espaçamento
    },
    inputFieldContainer: {
        marginBottom: 25, // Espaço entre os campos de input
    },
    label: {
        fontSize: 16, // Tamanho da label como na imagem
        color: "#000000", // Cor da label
        marginBottom: 8, // Espaço entre a label e o input
        fontWeight: "400", // Peso da fonte da label
    },
    input: {
        fontSize: 17,
        paddingVertical: 10, // Padding vertical para o input
        color: "#000000",
        borderBottomWidth: 1.5, // Linha inferior mais proeminente
        borderBottomColor: "#4CAF50", // Cor verde para a linha do input (como na imagem)
        // Remover paddingHorizontal se a linha deve ir de ponta a ponta
    },
    infoText: {
        fontSize: 14,
        color: "#8E8E93", // Cinza para o texto informativo
        textAlign: "center",
        marginTop: 30,
        paddingHorizontal: 20, // Para não colar nas bordas
        lineHeight: 20,
    },
    headerButton: {
        paddingHorizontal: 8, // Aumentado para corresponder ao estilo iOS
        paddingVertical: 10,
        fontSize: 17,
    },
    headerButtonText: {
        // Estilo genérico para botões de texto no header
        fontSize: 17,
    },
    headerButtonTextCancel: {
        color: "#007AFF",
        fontSize: 17,
    },
    headerButtonTextAdd: {
        color: "#007AFF", // Azul para "Adicionar"
        fontWeight: "600",
        fontSize: 17, // Negrito para o botão de ação principal
    },
    headerButtonDisabled: {
        color: "#BDBDBD",
        fontSize: 17, // Cinza para desativado
    },
    headerStyle: {
        backgroundColor: "#FFFFFF",
    },
});