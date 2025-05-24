// app/add-expense.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useNavigation,
    useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabase";

import type { SplitTypeOption } from "../select-split-type";
import { SELECTED_EXPENSE_DATE_KEY } from '../select-date';

const ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY = "selected_split_option";

const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    // Adiciona um dia para corrigir potenciais problemas de fuso horário que fazem a data parecer um dia antes
    const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return `${adjustedDate.toLocaleDateString('pt-PT', { day: 'numeric' })} de ${adjustedDate.toLocaleDateString('pt-PT', { month: 'short' }).replace('.','')}`;
};

export default function AddExpenseScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{
        friendId?: string;
        friendName?: string;
        currentOptionId?: string;
    }>();
    const { auth } = useAuth();
    const insets = useSafeAreaInsets();

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [selectedFriend, setSelectedFriend] = useState<{
        id: string;
        name: string;
        avatarUrl?: string;
    } | null>(null);
    const [selectedSplitOption, setSelectedSplitOption] =
        useState<SplitTypeOption | null>(null);
    const [isLoadingSplitOption, setIsLoadingSplitOption] = useState(false); // Inicia como false
    const [displaySplitText, setDisplaySplitText] = useState(
        "Selecione como foi pago"
    ); // Default inicial
    const [isSaving, setIsSaving] = useState(false);
    // Novo estado para a data da despesa, inicializado com a data atual no formato YYYY-MM-DD
    const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Efeito para definir o amigo selecionado APENAS quando os PARÂMETROS DA ROTA mudam
    useEffect(() => {
        console.log(
            "[AddExpenseScreen] useEffect[params]: Params da rota recebidos:",
            params
        );
        const { friendId: pFriendId, friendName: pFriendName } = params;

        if (pFriendId && pFriendName) {
            // Define ou atualiza o amigo se o ID dos params for diferente do amigo já selecionado
            if (selectedFriend?.id !== pFriendId) {
                console.log(
                    "[AddExpenseScreen] useEffect[params]: Amigo definido/mudou para:",
                    pFriendName
                );
                setSelectedFriend({ id: pFriendId, name: pFriendName });
                setSelectedSplitOption(null); // Reseta a opção para o novo amigo
                setIsLoadingSplitOption(true); // Indica que a opção precisa ser (re)carregada
            }
        } else if (!pFriendId) {
            // Se não há friendId nos params (despesa genérica)
            if (selectedFriend !== null) {
                // Se havia um amigo selecionado antes, limpa-o
                console.log(
                    "[AddExpenseScreen] useEffect[params]: Nenhum amigo nos params, limpando selectedFriend."
                );
                setSelectedFriend(null);
                setSelectedSplitOption(null);
                setIsLoadingSplitOption(true);
            } else if (!selectedFriend && !selectedSplitOption) {
                // Estado inicial para despesa genérica, aciona o carregamento da opção default
                setIsLoadingSplitOption(true);
            }
        }
    }, [params.friendId, params.friendName]); // Só depende dos params

    // Função para carregar a opção de divisão
    const loadSplitOption = useCallback(async () => {
        // Não executa se já estiver a carregar
        if (isLoadingSplitOption && selectedSplitOption !== null) {
            console.log(
                "[loadSplitOption] Já está a carregar ou já tem opção, a saltar."
            );
            return;
        }

        console.log(
            "[loadSplitOption] Iniciando. Amigo atual:",
            selectedFriend?.name
        );
        setIsLoadingSplitOption(true);
        setDisplaySplitText("A carregar opção...");
        let optionToSet: SplitTypeOption | null = null;

        try {
            const storedOptionJson = await AsyncStorage.getItem(
                ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY
            );
            if (storedOptionJson) {
                optionToSet = JSON.parse(storedOptionJson) as SplitTypeOption;
                console.log(
                    "[loadSplitOption] Opção carregada do AsyncStorage:",
                    optionToSet?.description_template
                );
            } else {
                console.log(
                    "[loadSplitOption] Nenhuma opção no cache, buscando default (sort_order = 1) do Supabase..."
                );
                const { data, error } = await supabase
                    .from("expense_split_options")
                    .select("*")
                    .eq("sort_order", 1)
                    .maybeSingle();

                if (error && error.code !== "PGRST116") throw error;
                if (data) {
                    optionToSet = data as SplitTypeOption;
                    console.log(
                        "[loadSplitOption] Opção default carregada do Supabase:",
                        optionToSet?.description_template
                    );
                } else {
                    console.log(
                        "[loadSplitOption] Nenhuma opção default (sort_order=1) encontrada no Supabase."
                    );
                }
            }
        } catch (error: any) {
            console.error(
                "Erro ao carregar opção de divisão em loadSplitOption:",
                error
            );
            Alert.alert("Erro", "Não foi possível carregar as opções de divisão.");
        } finally {
            setSelectedSplitOption(optionToSet);
            setIsLoadingSplitOption(false);
        }
    }, []); // useCallback com array de dependências vazio torna esta função estável

    // useFocusEffect para ler a data selecionada do AsyncStorage
    useFocusEffect(
        useCallback(() => {
        const loadSelectedDate = async () => {
            try {
                const storedDate = await AsyncStorage.getItem(SELECTED_EXPENSE_DATE_KEY);
                if (storedDate) {
                    console.log("[AddExpenseScreen] Data carregada do AsyncStorage:", storedDate);
                    setExpenseDate(storedDate);
                    // Opcional: Limpar após ler para que não afete a próxima vez que o ecrã for aberto,
                    // a menos que o utilizador selecione novamente.
                    // await AsyncStorage.removeItem(SELECTED_EXPENSE_DATE_KEY);
                } else {
                    console.log("[AddExpenseScreen] Nenhuma data selecionada no AsyncStorage.");
                    // Mantém a data atual se nada for encontrado (já definido no useState inicial)
                }
            } catch (e) {
                console.error("Erro ao ler data selecionada do AsyncStorage:", e);
            }
        };
        loadSelectedDate();
        }, []) // Executa apenas quando o ecrã ganha foco
    );

    // Efeito para carregar a opção de divisão quando o amigo selecionado muda
    // ou quando o ecrã foca e ainda não temos uma opção selecionada.
    useEffect(() => {
        // Este efeito é acionado se selectedFriend mudar OU se selectedSplitOption for null (e não estiver a carregar)
        // A ideia é carregar a opção default para o amigo selecionado, ou a opção do AsyncStorage.
        if (isLoadingSplitOption || selectedSplitOption) {
            // Se já está a carregar, ou se já temos uma opção, não faz nada para evitar loops.
            // O selectedSplitOption pode ter vindo do AsyncStorage via useFocusEffect.
            return;
        }
        console.log(
            "[AddExpenseScreen] useEffect[selectedFriend, selectedSplitOption, isLoadingSplitOption] -> chamando loadSplitOption"
        );
        loadSplitOption();
    }, [
        selectedFriend,
        selectedSplitOption,
        isLoadingSplitOption,
        loadSplitOption,
    ]);

    // useFocusEffect para carregar a opção do AsyncStorage quando o ecrã ganha foco
    // (caso o utilizador tenha selecionado uma no ecrã SelectSplitTypeScreen)
    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", async () => {
            console.log("AddExpenseScreen GANHOU FOCO (via listener)");
            try {
                const storedOptionJson = await AsyncStorage.getItem(
                    ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY
                );
                if (storedOptionJson) {
                    const storedOption = JSON.parse(storedOptionJson) as SplitTypeOption;
                    console.log(
                        "[Focus Listener] Opção carregada do AsyncStorage:",
                        storedOption.description_template
                    );
                    setSelectedSplitOption(storedOption);
                    setIsLoadingSplitOption(false); // Se carregou do cache, não está mais a carregar
                } else if (!selectedSplitOption) {
                    // Se não há nada no cache e nada no estado, aciona o loadSplitOption
                    // para buscar a default do Supabase.
                    loadSplitOption();
                }
            } catch (e) {
                console.error(
                    "Erro ao ler 'selected_split_option' do AsyncStorage no focus:",
                    e
                );
            }
        });
        return unsubscribe;
    }, [navigation, loadSplitOption, selectedSplitOption]);

    // Efeito para atualizar o texto de exibição da opção de divisão
    useEffect(() => {
        if (isLoadingSplitOption) {
            setDisplaySplitText("A carregar opção...");
        } else if (selectedSplitOption) {
            setDisplaySplitText(
                selectedSplitOption.description_template.replace(
                    "{friendName}",
                    selectedFriend?.name || "amigo"
                )
            );
        } else {
            setDisplaySplitText("Selecione como foi pago");
        }
    }, [selectedSplitOption, selectedFriend?.name, isLoadingSplitOption]);

    const handleSaveExpense = useCallback(async () => {
        // ... (lógica de handleSaveExpense) ...
        if (
            !auth.user?.id ||
            (!selectedFriend?.id && params.friendId) ||
            !description.trim() ||
            !amount.trim() ||
            !selectedSplitOption
        ) {
            Alert.alert(
                "Campos em falta",
                "Verifique todos os campos e a seleção de divisão."
            );
            return;
        }
        const numericAmount = parseFloat(amount.replace(",", "."));
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert("Valor inválido", "Insira um valor monetário válido.");
            return;
        }
        setIsSaving(true);
        let userShare = 0;
        const splitDivisor = 2;
        switch (selectedSplitOption.split_type) {
            case "EQUALLY":
                userShare = selectedSplitOption.user_pays_total
                    ? numericAmount / splitDivisor
                    : -(numericAmount / splitDivisor);
                break;
            case "FRIEND_OWES_USER_TOTAL":
                userShare = numericAmount;
                break;
            case "USER_OWES_FRIEND_TOTAL":
                userShare = -numericAmount;
                break;
            default:
                Alert.alert("Erro", "Tipo de divisão inválido.");
                setIsSaving(false);
                return;
        }

        console.log("[AddExpense] User Share:", userShare, "Split type:", selectedSplitOption.split_type);
        try {
            const newExpense = {
                user_id: auth.user.id,
                friend_id: selectedFriend?.id,
                description: description.trim(),
                total_amount: numericAmount,
                date: expenseDate,
                updated_at: new Date().toISOString(),
                paid_by_user: selectedSplitOption.user_pays_total,
                user_share: userShare,
            };
            console.log("[AddExpense] A inserir nova despesa");
            const {data: insertNewExpense, error: insertNewExpenseError} = await supabase
                .from("expenses")
                .insert([newExpense])
                .single()
                .throwOnError();
            console.log("[AddExpense] Nova despesa inserida:", insertNewExpense);
            if (selectedFriend?.id) {
                const { data: friendData, error: friendFetchError } = await supabase
                    .from("friends")
                    .select("balance")
                    .eq("user_id", auth.user.id)
                    .eq("id", selectedFriend.id)
                    .single();
                console.log("[AddExpense] Dados do amigo:", friendData);
                
                if (friendFetchError && friendFetchError.code !== "PGRST116")
                    throw friendFetchError;
                const currentFriendBalance = friendData?.balance || 0;
                console.log("[AddExpense] Balanço do amigo:", currentFriendBalance);
                const newFriendBalance = currentFriendBalance + userShare;
                console.log("[AddExpense] Balanço atual do amigo a ser atualizado:", currentFriendBalance);
                const {data: updateBalance, error: updateBalanceError} = await supabase
                    .from("friends")
                    .update({
                        balance: newFriendBalance,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", selectedFriend.id)
                    .eq("user_id", auth.user.id)
                    .select()
                    .throwOnError();
                console.log("[AddExpense] Balanço do amigo atualizado:", updateBalance);
            }
            Alert.alert("Sucesso", "Despesa adicionada!");
            await AsyncStorage.removeItem(ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY);
            await AsyncStorage.removeItem(SELECTED_EXPENSE_DATE_KEY);
            setSelectedSplitOption(null);
            setDescription("");
            setAmount("");
            setExpenseDate(new Date().toISOString().split('T')[0]); // Reset date

            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
        } catch (error: any) {
            console.error("Erro ao guardar despesa:", error);
            Alert.alert("Erro", `Guardar falhou: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [
        auth.user,
        selectedFriend,
        description,
        amount,
        selectedSplitOption,
        router,
        params.friendId,
        expenseDate,
    ]);

    const canSaveChanges =
        description.trim() !== "" &&
        amount.trim() !== "" &&
        parseFloat(amount.replace(",", ".")) > 0 &&
        selectedSplitOption !== null &&
        !isLoadingSplitOption;

    useEffect(() => {
        console.log(
            `[setOptions Effect] Executando. canSaveChanges: ${canSaveChanges}, isSaving: ${isSaving}`
        );
        navigation.setOptions({
            headerShown: true,
            headerTitle: "Adicionar uma despesa",
            headerLeft: () =>
                Platform.OS === "ios" ? (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.headerButton}
                    >
                        <Ionicons name="close" size={28} color="#000" />
                    </TouchableOpacity>
                ) : null,
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleSaveExpense}
                    disabled={!canSaveChanges || isSaving}
                    style={styles.headerButton}
                >
                    <Text
                        style={[
                            styles.saveButtonText,
                            (!canSaveChanges || isSaving) && styles.saveButtonDisabledText,
                        ]}
                    >
                        {isSaving ? "A guardar..." : "Guardar"}
                    </Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, canSaveChanges, isSaving, handleSaveExpense, router]);

    if (!selectedFriend && !params.friendId && isLoadingSplitOption) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen
                    options={{ presentation: "modal", title: "Adicionar Despesa" }}
                />
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>A carregar...</Text>
            </View>
        );
    }
    if (!selectedFriend && !params.friendId && !isLoadingSplitOption) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen
                    options={{ presentation: "modal", title: "Adicionar Despesa" }}
                />
                <Text style={styles.infoText}>Com quem partilhou esta despesa?</Text>
                <Text style={[styles.infoText, {fontSize: 14}]}>Escolha um amigo</Text>
                <View style={{ marginTop: 20 }}>
                    <Button
                        title="Voltar atrás"
                        onPress={() =>
                            router.canGoBack() ? router.back() : router.replace("/(tabs)")
                        }
                    />
                </View>
            </View>
        );
    }

    if (params.friendId && !selectedFriend) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen
                    options={{ presentation: "modal", title: "Adicionar Despesa" }}
                />
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>A carregar dados do amigo...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.screenContainer]}>
            <Stack.Screen options={{ 
                presentation: "modal",
                headerShadowVisible: false,
            }}/>

            {selectedFriend && ( 
                <View style={styles.friendSelector}>
                    <Text style={styles.withUserText}>Com:</Text>
                        {selectedFriend.avatarUrl && selectedFriend.avatarUrl !== 'placeholder' ? (
                            <Image source={{uri: selectedFriend.avatarUrl}} style={styles.friendAvatar} />
                        ) : ( <View style={styles.friendAvatarPlaceholder} /> )}
                    <Text style={styles.friendName}>{selectedFriend.name}</Text>
                </View>
            )}
            
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.mainContentContainer}>
                    <View style={styles.inputContainer}>
                        <Ionicons
                            name="document-text-outline"
                            size={24}
                            color="#888"
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.inputDescription}
                            placeholder="Insira a descrição"
                            value={description}
                            onChangeText={setDescription}
                            placeholderTextColor="#B0B0B0"
                        />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.currencySymbol}>€</Text>
                        <TextInput
                            style={styles.inputAmount}
                            placeholder="0,00"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#B0B0B0"
                        />
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.splitTypeButton,
                            !selectedFriend && !!params.friendId && styles.disabledSplitButton,
                        ]}
                        onPress={() => {
                            if (selectedFriend || !params.friendId) {
                                router.push({
                                    pathname: "/select-split-type",
                                    params: {
                                        friendName: selectedFriend?.name,
                                        currentOptionId: selectedSplitOption?.id,
                                    },
                                });
                            }
                        }}
                        disabled={
                            (!selectedFriend && !!params.friendId) || isLoadingSplitOption
                        }
                    >
                        <Text style={styles.splitTypeButtonText}>{displaySplitText}</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={
                                (!selectedFriend && !!params.friendId) || isLoadingSplitOption
                                    ? "#ccc"
                                    : "#888"
                            }
                        />
                    </TouchableOpacity>
                    <View style={styles.bottomControls}>
                        <View style={styles.leftControls}>
                            <TouchableOpacity 
                                    style={styles.controlButton}
                                    onPress={() => router.push({ 
                                    pathname: '/select-date', 
                                    params: { currentDate: expenseDate } // Passa a data atual para o modal
                                })}
                            >
                                <Ionicons name="calendar-outline" size={24} color="#555" style={styles.controlIcon} />
                                {/* Mostra a data selecionada ou "Hoje" */}
                                <Text style={styles.controlButtonText}>
                                    {expenseDate === new Date().toISOString().split('T')[0] ? 'Hoje' : formatDateForDisplay(expenseDate)}
                                </Text>
                            </TouchableOpacity>
                            {/* <TouchableOpacity style={styles.controlButton}>
                                <MaterialCommunityIcons name="account-group-outline" size={24} color="#555" style={styles.controlIcon} />
                                <Text style={styles.controlButtonText}>Sem grupo</Text>
                            </TouchableOpacity> */}
                        </View>
                        <TouchableOpacity 
                            style={styles.controlButton}
                            onPress={() => Alert.alert("Sem grupo", "Funcionalidade ainda não implementada.")}
                        >
                            <Ionicons name="people-outline" size={20} color="#555" style={styles.controlIcon} />
                            <Text>Sem grupo</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* <View style={styles.bottomActionsContainer}>
                    <View style={styles.leftControls}>
                        <TouchableOpacity style={styles.controlButton}><Ionicons name="calendar-outline" size={24} color="#555" style={styles.controlIcon} /><Text style={styles.controlButtonText}>Hoje</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.controlButton}><MaterialCommunityIcons name="account-group-outline" size={24} color="#555" style={styles.controlIcon} /><Text style={styles.controlButtonText}>Sem grupo</Text></TouchableOpacity>
                    </View>
                    <View style={styles.rightControls}>
                        <TouchableOpacity style={styles.controlButton}><Ionicons name="camera-outline" size={24} color="#555" /></TouchableOpacity>
                        <TouchableOpacity style={[styles.controlButton, {marginLeft: 15}]}><Ionicons name="pencil-outline" size={22} color="#555" /></TouchableOpacity>
                    </View>
                </View> */}

            </ScrollView>
            {isSaving && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>A guardar...</Text>
                </View>
            )}
        </View>
    );
}

// ... (os seus styles permanecem os mesmos da versão anterior)
const styles = StyleSheet.create({
    screenContainer: { 
        flex: 1, 
        backgroundColor: "#F4F6F8", 
    },
    scrollContent: { 
        paddingHorizontal: 20, 
        paddingBottom: 20, 
        flexGrow: 1,
    },
    mainContentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    saveButton: {
        color: "#007AFF",
        fontSize: 17,
        fontWeight: "500",
        marginRight: Platform.OS === "ios" ? 10 : 16,
        paddingVertical: 5,
    },
    saveButtonDisabled: { color: "#BDBDBD" }, // Cor iOS para desativado
    headerButton: {
        paddingHorizontal: Platform.OS === "ios" ? 10 : 16,
        paddingVertical: 5,
    },
    friendSelector: { // Estilo para o seletor de amigo no topo
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 12, 
        paddingHorizontal: 20, 
        backgroundColor: '#fff', 
    },
    withUserText: { fontSize: 16, color: "#555", marginRight: 8 },
    friendAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
    friendAvatarPlaceholder: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        backgroundColor: "#E0E0E0",
    },
    friendName: { fontSize: 16, fontWeight: "500", color: "#333" },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    inputIcon: { marginRight: 10 },
    inputDescription: { flex: 1, height: 55, fontSize: 17, color: "#333" },
    currencySymbol: { fontSize: 36, color: "#888", marginRight: 8 },
    inputAmount: {
        flex: 1,
        height: 70,
        fontSize: 36,
        fontWeight: "300",
        color: "#333",
    },
    splitTypeButton: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingVertical: 18,
        paddingHorizontal: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    splitTypeButtonText: {
        fontSize: 16,
        color: "#333",
        flexShrink: 1,
        marginRight: 5,
    },
    disabledSplitButton: { opacity: 0.5 },
    bottomControls: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 20,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderRadius: 10,
    },
    controlIcon: { marginRight: 6 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    loadingText: { color: "#fff", marginTop: 10, fontSize: 16 },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    infoText: { fontSize: 18, textAlign: "center", marginBottom: 10 },
    infoSubText: { fontSize: 14, textAlign: "center", color: "gray" },
    saveButtonText: {
        color: Platform.OS === "ios" ? "#007AFF" : "#000000",
        fontSize: 17,
        fontWeight: Platform.OS === "ios" ? "600" : "500",
    },
    saveButtonDisabledText: {
        color: Platform.OS === "ios" ? "#BDBDBD" : "#9E9E9E",
    },
    bottomActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0', /* marginTop: 'auto', */ }, // marginTop: 'auto' removido para melhor controlo com flex
    leftControls: { flexDirection: 'row', },
    rightControls: { flexDirection: 'row', },
    controlButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: 5, },
    controlButtonText: { fontSize: 15, color: '#333', },
});
