// app/verify-contacts.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    Alert,
    Platform,
    Button,
    } from "react-native";
import {
    Stack,
    useRouter,
    useLocalSearchParams,
    useNavigation,
    } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../config/supabase"; // Ajuste o caminho
import { useAuth } from "../../context/AuthContext"; // Ajuste o caminho
import AsyncStorage from "@react-native-async-storage/async-storage";
    // Reutiliza a interface ContactItem de AddFriendFlowScreen
    // Idealmente, esta interface estaria num ficheiro de tipos partilhado
    interface ContactItem {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    emails?: Array<{ email: string; label: string; id: string }>;
    phoneNumbers?: Array<{ number?: string; label: string; id: string }>;
    imageAvailable?: boolean;
    image?: { uri: string };
    // Não precisa de isSelected aqui
    }

    const DEFAULT_AVATAR_VERIFY =
    "https://via.placeholder.com/60/BDBDBD/FFFFFF?Text=";

    export default function VerifyContactsScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ selectedContacts?: string }>();
    const { auth } = useAuth();
    const insets = useSafeAreaInsets();

    const [contactsToVerify, setContactsToVerify] = useState<ContactItem[]>([]);

    useEffect(() => {
        if (params.selectedContacts) {
            try {
            const parsedContacts = JSON.parse(
                params.selectedContacts
            ) as ContactItem[];
            setContactsToVerify(parsedContacts);
            if (parsedContacts.length === 0) {
                // Se a lista inicial já estiver vazia, volta
                Alert.alert("Nenhum contacto", "Não há contactos para verificar.");
                router.back();
            }
            } catch (e) {
            console.error("Erro ao fazer parse dos contactos selecionados:", e);
            Alert.alert(
                "Erro",
                "Não foi possível carregar os contactos para verificação."
            );
            router.back();
            }
        } else if (!params.selectedContacts && contactsToVerify.length === 0) {
            // Se não há params e a lista está vazia (ex: utilizador voltou para este ecrã de alguma forma)
            Alert.alert("Nenhum contacto", "Não há contactos para verificar.");
            router.back();
        }
    }, [params.selectedContacts]); 

    const handleConclude = async () => {
        if (!auth.user?.id || contactsToVerify.length === 0) {
        Alert.alert(
            "Erro",
            "Nenhum contacto para adicionar ou utilizador não autenticado."
        );
        return;
        }

        const friendsToAdd = contactsToVerify.map((contact) => ({
        user_id: auth.user!.id, // auth.user.id já foi verificado
        name: contact.name,
        // Aqui pode decidir qual informação do contacto usar para um futuro 'contact_info' ou 'phone'/'email'
        // Por exemplo, o primeiro número de telefone ou email
        phone: contact.phoneNumbers?.[0]?.number || null,
        email: contact.emails?.[0]?.email || null,
        avatar_url:
            contact.imageAvailable && contact.image ? contact.image.uri : null, // Avatar local não será guardado diretamente
        balance: 0,
        // Adicione um campo para o ID do contacto do dispositivo se quiser evitar duplicados futuros
        // device_contact_id: contact.id
        }));

        console.log("A adicionar amigos ao Supabase:", friendsToAdd);

        try {
        const { error } = await supabase.from("friends").insert(friendsToAdd);
        if (error) throw error;

        Alert.alert("Sucesso!", `${friendsToAdd.length} amigo(s) adicionado(s).`);
        // Limpar cache de amigos no ecrã principal para recarregar
        const friendsListCacheKey = `paga_a_mostarda_friends_data_v2_${auth.user.id}`; // Use a chave correta
        await AsyncStorage.removeItem(friendsListCacheKey);

        // Voltar para o ecrã de amigos (index das tabs)
        router.replace("/(tabs)");
        } catch (error: any) {
        console.error("Erro ao adicionar amigos ao Supabase:", error);
        Alert.alert(
            "Erro",
            `Não foi possível adicionar os amigos: ${error.message}`
        );
        }
    };

    const handleRemoveContact = (contactIdToRemove: string) => {
        Alert.alert(
            "Remover Contacto",
            "É para remover esta pessoa da lista de adição?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: () => {
                        const updatedContacts = contactsToVerify.filter(
                            (contact) => contact.id !== contactIdToRemove
                        );
                        setContactsToVerify(updatedContacts);
                        // Se a lista ficar vazia após remover, volta para o ecrã anterior
                        if (updatedContacts.length === 0) {
                            Alert.alert(
                            "Lista Vazia",
                            "Todos os contactos foram removidos da lista de verificação."
                            );
                            router.back();
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        navigation.setOptions({
            presentation: "modal",
            headerShown: true,
            title: "Verificar informações",
            headerTitleAlign: "center",
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerNavButton}
                >
                    <Ionicons
                    name="chevron-back"
                    size={28}
                    color={Platform.OS === "ios" ? "#007AFF" : "#000"}
                    />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleConclude}
                    style={styles.headerNavButton}
                    disabled={contactsToVerify.length === 0}
                >
                    <Text
                    style={[
                        styles.headerButtonTextConclude,
                        contactsToVerify.length === 0 && styles.headerButtonDisabled,
                    ]}
                    >
                        Concluir
                    </Text>
                </TouchableOpacity>
            ),
            headerStyle: styles.headerStyle,
        });
    }, [navigation, router, handleConclude, contactsToVerify.length]);

    const renderVerifyItem = ({ item }: { item: ContactItem }) => {
        const displayInfo =
            item.phoneNumbers?.[0]?.number ||
            item.emails?.[0]?.email ||
            "Sem informação de contacto";
        const avatarText = (item.firstName ||
            item.name.split(" ")[0] ||
            " ")[0].toUpperCase();

        return (
            <View style={styles.verifyItemContainer}>
            <View style={styles.verifyAvatarContainer}>
                {item.imageAvailable && item.image ? (
                <Image
                    source={{ uri: item.image.uri }}
                    style={styles.verifyAvatar}
                />
                ) : (
                <View
                    style={[styles.verifyAvatar, styles.verifyAvatarPlaceholder]}
                >
                    <Text style={styles.verifyAvatarText}>{avatarText}</Text>
                </View>
                )}
                {/* Ícone 'x' para remover da lista de verificação */}
                <TouchableOpacity
                style={styles.removeChipIconTouchable}
                onPress={() => handleRemoveContact(item.id)}
                >
                <View style={styles.removeChipIconBackground}>
                    <Ionicons name="close" size={14} color="#8E8E93" />
                </View>
                </TouchableOpacity>
            </View>
            <View style={styles.verifyInfo}>
                <Text style={styles.verifyName}>{item.name}</Text>
                <Text style={styles.verifyContactDetail}>{displayInfo}</Text>
            </View>
            <TouchableOpacity
                onPress={() =>
                Alert.alert(
                    "Editar Contacto",
                    `Editar ${item.name} (funcionalidade a implementar)`
                )
                }
            >
                <Text style={styles.editText}>Editar</Text>
            </TouchableOpacity>
            </View>
        );
    };

    if (contactsToVerify.length === 0 && !params.selectedContacts) {
      // Se entra no ecrã sem contactos (ex: após remover todos)
        return (
            <View style={styles.loadingContainer}>
                <Text>Nenhum contacto para verificar.</Text>
                <Button title="Voltar" onPress={() => router.back()} />
            </View>
        );
    }

    return (
        <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
        <FlatList
            data={contactsToVerify}
            renderItem={renderVerifyItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
            <Text style={styles.infoText}>
                Estas pessoas serão notificadas de que as adicionou como amigos.
                Pode começar de imediato a adicionar despesas.
            </Text>
            }
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
        </View>
    );
    }

    const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    headerNavButton: {
        paddingHorizontal: 10,
    },
    headerButtonTextConclude: {
        color: "#007AFF",
        fontSize: 17,
        fontWeight: "600",
    },
    headerStyle: {
        backgroundColor: "#FFFFFF",
        borderBottomColor: "transparent",
        shadowColor: 'transparent',
    },
    infoText: {
        fontSize: 15,
        color: "#6D6D72",
        textAlign: "center",
        paddingHorizontal: 20,
        paddingVertical: 20,
        lineHeight: 20,
    },
    verifyItemContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
    },
    verifyAvatarContainer: {
        marginRight: 12,
    },
    verifyAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    verifyAvatarPlaceholder: {
        backgroundColor: "#E0E0E0",
        justifyContent: "center",
        alignItems: "center",
    },
    verifyAvatarText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "500",
    },
    removeChipIcon: {
        position: "absolute",
        top: -2,
        right: -2,
        backgroundColor: "#fff", // Para criar o efeito de círculo branco à volta do X
        borderRadius: 11,
    },
    verifyInfo: {
        flex: 1,
    },
    verifyName: {
        fontSize: 17,
        fontWeight: "500",
        color: "#000",
        marginBottom: 2,
    },
    verifyContactDetail: {
        fontSize: 15,
        color: "#8E8E93",
    },
    editText: {
        fontSize: 17,
        color: "#007AFF",
        fontWeight: "500",
    },
    itemSeparator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#E0E0E0",
        marginLeft: 16 + 60 + 12, // marginLeft do avatar + largura do avatar + marginRight do avatar
    },
    removeChipIconTouchable: {
        position: 'absolute',
        top: -5,  // Ajuste para posicionar o 'x'
        right: -5, // Ajuste para posicionar o 'x'
        zIndex: 1, // Para garantir que fica por cima
    },
    removeChipIconBackground: {
        backgroundColor: '#E0E0E0', // Fundo do círculo do 'x'
        borderRadius: 11, // Metade da largura/altura do ícone Ionicons
        padding: 2, // Pequeno padding para o círculo
    },
    loadingContainer: { // Adicionado para o caso de lista vazia
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerButtonDisabled: {
        color: '#BDBDBD',
    },
});
