// app/basic-modal.tsx
import { Ionicons } from "@expo/vector-icons";
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
import { supabase } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

import { SELECTED_EXPENSE_DATE_KEY } from './select-date';
import { ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY, type SplitTypeOption } from "./select-split-type";
import { BlurView } from 'expo-blur';

type AddExpenseModalScreenParams = {
    friendId?: string;
    friendName?: string;
    friendAvatarUrl?: string;
    // Parâmetros para edição
    editingExpenseId?: string;
    description?: string;
    totalAmount?: string; // Vem como string
    expenseDate?: string; // Vem como string ISO
    paidByUser?: string;  // Vem como string ('true' ou 'false')
    userShare?: string;   // Vem como string
    categoryIcon?: keyof typeof Ionicons.glyphMap;
    splitOptionId?: string;
    registeredFriendId?: string;
}

type ExpensePayload = {
    user_id: string,
    friend_id: string | undefined,
    description: string,
    total_amount: any,
    user_share: any,
    date: string,
    paid_by_user: boolean,
    split_option_id: string,
    updated_at: string,
};

export const EXPENSE_ADDED_OR_MODIFIED_SIGNAL_KEY = 'paga_a_mostarda_expense_added_or_modified_signal';

const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    // Adiciona um dia para corrigir potenciais problemas de fuso horário que fazem a data parecer um dia antes
    const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return `${adjustedDate.toLocaleDateString('pt-PT', { day: 'numeric' })} de ${adjustedDate.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}`;
};

export default function AddExpenseModalScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<AddExpenseModalScreenParams>();
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
    const [isLoadingSplitOption, setIsLoadingSplitOption] = useState(false);
    const [displaySplitText, setDisplaySplitText] = useState(
        "Selecione como foi pago"
    );
    const [isSaving, setIsSaving] = useState(false);
    // Novo estado para a data da despesa, inicializado com a data atual no formato YYYY-MM-DD
    const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString());
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(params.editingExpenseId || null);
    const [originalExpenseUserShare, setOriginalExpenseUserShare] = useState<number | null>(
        params.userShare ? parseFloat(params.userShare) : null
    );
    //console.log("[AddExpenseScreen] Data inicial:", new Date().toISOString());
    //console.log("[AddExpenseScreen] Data inicial expenseDate:", expenseDate);

    const loadSplitOption = useCallback(async (optionIdFromParams?: string, isEditingMode = false) => {
        //console.log(`[loadSplitOption] Iniciando. optionIdFromParams: ${optionIdFromParams}, isEditing: ${isEditingMode}`);
        setIsLoadingSplitOption(true);
        setDisplaySplitText('A carregar opção...');
        let optionToSet: SplitTypeOption | null = null;

        try {
            const storedOptionJson = await AsyncStorage.getItem(ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY);
            if (storedOptionJson) {
                optionToSet = JSON.parse(storedOptionJson) as SplitTypeOption;
                await AsyncStorage.removeItem(ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY);
            } else if (optionIdFromParams && isEditingMode) {
                const { data, error } = await supabase
                    .from('expense_split_options')
                    .select('*')
                    .eq('id', optionIdFromParams)
                    .single();
                if (error) throw error;
                optionToSet = data as SplitTypeOption;
                // TODO: fazer replace do placeholder {friendName} na descrição
                console.log("[loadSplitOption] optionSet", optionToSet);
                console.log("[loadSplitOption] selectedFriend.name", selectedFriend?.name);
                const descriptionTemplateUpdated = optionToSet.description_template.replace("{friendIdName}", params.friendName || "amigo");
                //optionToSet.description_template = descriptionTemplateUpdated;
                console.log("[loadSplitOption] optionSet.description_template", optionToSet.description_template);
            } else {
                const { data, error } = await supabase
                    .from('expense_split_options')
                    .select('*')
                    .eq('sort_order', 1)
                    .maybeSingle();
                if (error && error.code !== 'PGRST116') throw error;
                if (data) optionToSet = data as SplitTypeOption;
            }
        } catch (error: any) {
            console.error("Erro ao carregar opção de divisão:", error);
            Alert.alert("Erro", "Não foi possível carregar as opções de divisão.");
        } finally {
            console.log("[loadSplitOption] FINALLY optionSet", optionToSet);
            setSelectedSplitOption(optionToSet);
            setIsLoadingSplitOption(false);
        }
    }, []);

    // Efeito para configurar o ecrã com base nos parâmetros da rota (ao montar ou se os params mudarem)
    useEffect(() => {
        console.log("[AddExpenseModalScreen] useEffect[params] - Processando Params:", params);
        const {
            friendId: pFriendId, friendName: pFriendName, friendAvatarUrl: pFriendAvatarUrl,
            editingExpenseId: pEditingExpenseId, description: pDescription,
            totalAmount: pTotalAmount, expenseDate: pExpenseDateParam,
            userShare: pUserShare, splitOptionId: pSplitOptionId
        } = params;

        if (pEditingExpenseId) {
            console.log("[AddExpenseModalScreen] MODO DE EDIÇÃO ID:", pEditingExpenseId);
            setEditingExpenseId(pEditingExpenseId);
            setDescription(pDescription || "");
            setAmount(pTotalAmount || "");
            setExpenseDate(pExpenseDateParam || new Date().toISOString());
            if (pUserShare) setOriginalExpenseUserShare(parseFloat(pUserShare));
            if (pFriendId && pFriendName) {
                setSelectedFriend({ id: pFriendId, name: pFriendName, avatarUrl: pFriendAvatarUrl });
            }
            loadSplitOption(pSplitOptionId, true); // Carrega a opção específica para edição
        } else {
            // Modo de adição (com ou sem amigo)
            setEditingExpenseId(null);
            setOriginalExpenseUserShare(null);
            if (pFriendId && pFriendName) {
                setSelectedFriend({ id: pFriendId, name: pFriendName, avatarUrl: pFriendAvatarUrl });
            } else {
                setSelectedFriend(null); // Garante que está limpo para despesa genérica
            }
            loadSplitOption(undefined, false); // Carrega a opção default
        }
    }, [params.friendId, params.friendName, params.editingExpenseId, params.splitOptionId]);

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
                        await AsyncStorage.removeItem(SELECTED_EXPENSE_DATE_KEY);
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
        console.log("[AddExpenseScreen] useEffect[selectedFriend, selectedSplitOption, isLoadingSplitOption] -> chamando loadSplitOption");
        loadSplitOption();
    }, [
        selectedFriend,
        selectedSplitOption,
        isLoadingSplitOption,
        loadSplitOption,
    ]);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", async () => {
            console.log("[Focus Listener] GANHOU FOCO (via listener)");
            let dateFromStorage: string | null = null;
            try {
                // Opção de DIVISÃO
                const storedOptionJson = await AsyncStorage.getItem(ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY);
                console.log("[Focus Listener] Opção de DIVISÃO carregada do AsyncStorage", storedOptionJson);
                if (storedOptionJson) {
                    const storedOption = JSON.parse(storedOptionJson) as SplitTypeOption;
                    await AsyncStorage.removeItem(ASYNC_STORAGE_SELECTED_SPLIT_OPTION_KEY);
                    console.log("[Focus Listener] Opção carregada e transformada", storedOption.description_template);
                    setSelectedSplitOption(storedOption);
                    setIsLoadingSplitOption(false); // Se carregou do cache, não está mais a carregar
                } else if (!selectedSplitOption && !isLoadingSplitOption) {
                    console.log("[Focus Listener] Não há opção na cache, a carregar default...");
                    // Se não veio do storage, E não há opção no estado, e não está a carregar,
                    // aciona o carregamento (default ou de edição, dependendo do estado de editingExpenseId)
                    loadSplitOption(params.splitOptionId, !!editingExpenseId);
                }
                // Opção DATA - Carregar data selecionada
                // TODO: talvez seja melhor validar a data 
                // para carregar como esta a ser feito para a opção de divisão
                const storedDateISO = await AsyncStorage.getItem(SELECTED_EXPENSE_DATE_KEY);
                console.log("[Focus Listener] Opção DATA carregada do AsyncStorage", storedOptionJson);
                if (storedDateISO) {
                    dateFromStorage = storedDateISO;
                    if (dateFromStorage) {
                        setExpenseDate(dateFromStorage);
                    }
                    console.log("[FocusEffect] Data (ISO) carregada do AsyncStorage:", storedDateISO);
                    await AsyncStorage.removeItem(SELECTED_EXPENSE_DATE_KEY);
                }
            } catch (e) {
                console.error("Erro ao ler 'selected_split_option' do AsyncStorage no focus:", e);
            }
        });
        return unsubscribe;
    }, [navigation, loadSplitOption, selectedSplitOption]);

    useEffect(() => {
        console.log("[AddExpenseModalScreen] Texto de exibição da opção de divisão", selectedSplitOption);
        console.log("[AddExpenseModalScreen] Esta a carregar texto de exibição da opção de divisão", isLoadingSplitOption);
        if (isLoadingSplitOption) {
            setDisplaySplitText("A carregar opção...");
        } else if (selectedSplitOption) {
            setDisplaySplitText(selectedSplitOption.description_template.replace("{friendIdName}", selectedFriend?.name || "amigo"));
        } else {
            setDisplaySplitText("Selecione como foi pago");
        }
    }, [selectedSplitOption, selectedFriend?.name, isLoadingSplitOption, selectedSplitOption?.description_template]);

    const handleCustomBack = useCallback(() => {
        // Ecrã EDITAR: lógica para voltar ao ecrã detalhe da despesa
        if (params.editingExpenseId && params.friendId && params.friendName) {
            console.log(
                `[AddExpenseModalScreen] A voltar para o detalhe da despesa: /friend/expense/${params.editingExpenseId}`
            );
            router.replace({
                pathname: "/(tabs)/friend/expense/[expenseId]",
                params: {
                    expenseId: params.editingExpenseId, // O ID da despesa para o ecrã de detalhe
                    friendId: params.friendId,
                    friendName: params.friendName,
                },
            });
        // Ecrã ADICIONAR: lógica para voltar ao ecrã lista de despesas do amigo
        } else if (params.friendId && params.friendName) {
            //console.log(`[handleCustomBack] Tentando voltar para o ecrã do amigo: /friend/${params.friendId}`);
            router.back();
        } else {
            //console.log("[handleCustomBack] Não pode voltar, a usar replace para a raiz das tabs.");
            router.replace('/(tabs)'); // Fallback para a rota inicial das tabs (Amigos)
        }
    }, [router, params.friendId, params.friendName]);

    const createUnidirectionalExpense = useCallback(async (expensePayload: any, calculatedUserShare: number) => {
        console.log("[createUnidirectionalExpense] A inserir nova despesa...");
        await supabase
            .from("expenses")
            .insert([expensePayload])
            .single()
            .throwOnError();

        if (selectedFriend?.id) {
            const { data: friendData, error: friendFetchError } = await supabase
                .from("friends")
                .select("balance")
                .eq("user_id", auth.user?.id)
                .eq("id", selectedFriend.id)
                .single();
            if (friendFetchError && friendFetchError.code !== "PGRST116") throw friendFetchError;

            const currentFriendBalance = friendData?.balance || 0;
            const newFriendBalance = currentFriendBalance + calculatedUserShare;

            await supabase
                .from("friends")
                .update({
                    balance: newFriendBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", auth.user?.id)
                .eq("id", selectedFriend.id)
                .throwOnError();
        }
    }, [auth.user, selectedFriend]); // Dependências para criar uma despesa

    /* const handleEditExistingExpense = useCallback(async (expensePayload: any, calculatedUserShare: number) => {
        console.log("[handleUpdateExistingExpense] A editar despesa existente:", editingExpenseId);
        await supabase
            .from("expenses")
            .update(expensePayload)
            .eq("id", editingExpenseId)
            .eq("user_id", auth.user?.id) // Garante que só o dono pode editar
            .throwOnError();

        if (selectedFriend?.id && originalExpenseUserShare !== null) {
            const { data: friendData, error: friendFetchError } = await supabase
                .from("friends")
                .select("balance")
                .eq("user_id", auth.user?.id)
                .eq("id", selectedFriend.id)
                .single();
            if (friendFetchError && friendFetchError.code !== "PGRST116") throw friendFetchError;

            const currentFriendBalance = friendData?.balance || 0;
            // Reverte o impacto antigo e aplica o novo
            const newFriendBalance = currentFriendBalance - originalExpenseUserShare + calculatedUserShare;

            await supabase
                .from("friends")
                .update({
                    balance: newFriendBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", auth.user?.id)
                .eq("id", selectedFriend.id)
                .throwOnError();
        }
    }, [auth.user, selectedFriend, editingExpenseId, originalExpenseUserShare]); */

    const addNewExpense = async (expenseData: ExpensePayload, calculatedUserShare: number) => {
        // Verificar se o amigo está registado
        const { data: friendData } = await supabase
            .from('friends')
            .select('id, balance, registered_user_id')
            .eq('user_id', auth.user?.id)
            .eq('id', params.friendId)
            .single();
    
        const isRegistered = friendData?.registered_user_id !== null;
    
        if(isRegistered) {
            // Amigo registado → criar 2 entradas
            await createBidirectionalExpense(expenseData, friendData);
        } else {
            // Amigo não registado → criar apenas 1 entrada
            await createUnidirectionalExpense(expenseData, calculatedUserShare);
        }
    };

    const createBidirectionalExpense = async (
        expenseFriendData: ExpensePayload, 
        friendData: {
            registered_user_id: any;
            id: any;
        } | null
    ) => {
        // Encontrar a amizade recíproca (B → A)
        const { data: reciprocalFriend } = await supabase
            .from('friends')
            .select('id')
            .eq('user_id', friendData?.registered_user_id)
            .eq('registered_user_id', auth.user?.id)
            .single();

        console.log("[createBidirectionalExpense] A inserir 2 novas despesas...");
        
    

        // Atualizar ambos os saldos
        console.log("[createBidirectionalExpense] A chamar edge function...");

        // Chamar a Edge Function
        const { data: response, error } = await supabase
            .functions
            .invoke('create-bidirectional-expense', {
                body: {
                expenseData: {
                    description: expenseFriendData.description,
                    total_amount: expenseFriendData.total_amount,
                    date: expenseFriendData.date,
                    user_share: expenseFriendData.user_share,
                    paid_by_user: expenseFriendData.paid_by_user,
                    split_option_id: expenseFriendData.split_option_id,
                    updated_at: new Date().toISOString(),
                },
                friendData: {
                    id: friendData?.id,
                    registered_user_id: friendData?.registered_user_id,
                },
                reciprocalFriendId: reciprocalFriend?.id,
            }
        });

        if (error) throw error;

        console.log("[createBidirectionalExpense] response from supabase", response);

        //await updateBothBalances(friendData?.id, reciprocalFriend?.id, expenseFriendData);
    };

    /* const updateBothBalances = async (friendAToB_id: string, friendBToA_id: string, expenseFriendData: any) => {
    
        
        const {data: balanceData, error} = await supabase.from('friends')
            .select('balance')
            .eq('id', friendAToB_id)
            .single();

        console.log("[createBidirectionalExpense] Buscar balanço A atual:", balanceData);

         // Atualizar saldo A → B
        const currentFriendBalance = expenseFriendData?.balance || 0;
        const newFriendBalance = currentFriendBalance + expenseFriendData.userShare;

        console.log("[createBidirectionalExpense] balanço A atualizar:", newFriendBalance);
        const { error: errorA } = await supabase
            .from('friends')
            .update({ 
                balance: newFriendBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', friendAToB_id);

        // Atualizar saldo B → A (valor invertido)
        // O saldo de B com A é simplesmente a soma invertida dos user_shares de A
        const newBalanceForB = newFriendBalance.reduce((acc: number, exp: { user_share: number; })=> acc - exp.user_share, 0);
        console.log("[createBidirectionalExpense] balanço B atualizar:", newBalanceForB);

        const { error: errorB } = await supabase
            .from('friends')
            .update({ 
                balance: newBalanceForB,
                updated_at: new Date().toISOString()
            })
            .eq('id', friendBToA_id);

        if (errorA || errorB) throw new Error('Erro ao atualizar saldos');
    }; */

    const editExistingExpense = useCallback(async (expensePayload: any, calculatedUserShare: number) => {
        console.log("[editExistingExpense] INICIO");
        console.log("[editExistingExpense] A editar despesa existente:", editingExpenseId);
        
        if (!selectedFriend?.id || originalExpenseUserShare === null) {
            throw new Error("Dados da despesa incompletos");
        }

        // Verificar se o amigo está registado
        const { data: friendData, error: friendDataError } = await supabase
            .from('friends')
            .select('id, registered_user_id')
            .eq('user_id', auth.user?.id)
            .eq('id', selectedFriend.id)
            .single();

        if (friendDataError) throw friendDataError;

        const isRegistered = friendData?.registered_user_id !== null;
        console.log("[editExistingExpense] Esta registado:", isRegistered);

        if (isRegistered) {
            await editBidirectionalExpense(expensePayload, calculatedUserShare, friendData);
        } else {
            await editUnidirectionalExpense(expensePayload, calculatedUserShare);
        }
    }, [auth.user, selectedFriend, editingExpenseId, originalExpenseUserShare]);

    const editBidirectionalExpense = useCallback(
        async (expensePayload: any, 
            calculatedUserShare: number, 
            friendData: { id: any; registered_user_id: any }) => {
        console.log("[editExistingExpense][editBidirectionalExpense] Amigo registado - usando Edge Function");

        // Encontrar amizade recíproca
        const { data: reciprocalFriend } = await supabase
        .from("friends")
        .select("id")
        .eq("user_id", friendData.registered_user_id)
        .eq("registered_user_id", auth.user?.id)
        .single();
        console.log("[editExistingExpense][editBidirectionalExpense] amizade recirpoca encontrada: ", reciprocalFriend);

        // Chamar Edge Function para edição bidirecional
        const { data, error } = await supabase.functions.invoke(
            "edit-bidirectional-expense",
            {
                body: {
                    editingExpenseId,
                    expensePayload: {
                        description: expensePayload.description,
                        total_amount: expensePayload.total_amount,
                        date: expensePayload.date,
                        user_share: expensePayload.user_share,
                        paid_by_user: expensePayload.paid_by_user,
                        split_option_id: expensePayload.split_option_id,
                        updated_at: new Date().toISOString(),
                    },
                    calculatedUserShare,
                    originalExpenseUserShare,
                    friendData: {
                        id: friendData.id,
                        registered_user_id: friendData.registered_user_id,
                    },
                    reciprocalFriendId: reciprocalFriend?.id,
                },
            }
        );

        if (error) throw error;
        console.log("[editExistingExpense][editBidirectionalExpense] Edição bidirecional concluída:", data);
    },[auth.user, editingExpenseId, originalExpenseUserShare]);

    const editUnidirectionalExpense = useCallback(
        async (expensePayload: any, calculatedUserShare: number) => {
            console.log("[editExistingExpense][editUnidirectionalExpense] Amigo não registado - fluxo unidirecional");

            // Atualizar despesa original
            await supabase
            .from("expenses")
            .update(expensePayload)
            .eq("id", editingExpenseId)
            .eq("user_id", auth.user?.id)
            .throwOnError();

            // Buscar saldo atual do amigo
            const { data: friendBalanceData, error: friendFetchError } =
            await supabase
                .from("friends")
                .select("balance")
                .eq("user_id", auth.user?.id)
                .eq("id", selectedFriend?.id)
                .single();

            if (friendFetchError && friendFetchError.code !== "PGRST116") {
                throw friendFetchError;
            }

            // Calcular e atualizar novo saldo
            const currentFriendBalance = friendBalanceData?.balance || 0;
            if (originalExpenseUserShare === null) {
                throw new Error("originalExpenseUserShare is null");
            }
            const newFriendBalance =
            currentFriendBalance - originalExpenseUserShare + calculatedUserShare;

            await supabase
            .from("friends")
            .update({
                balance: newFriendBalance,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", auth.user?.id)
            .eq("id", selectedFriend?.id)
            .throwOnError();

            console.log("[editExistingExpense][editUnidirectionalExpense] Saldo atualizado:", newFriendBalance);
        },
        [auth.user, selectedFriend, editingExpenseId, originalExpenseUserShare]
    );

    const handleSaveExpense = useCallback(async () => {
        console.log("[handleSaveExpense] A iniciar a guardar despesa...");
        if (
            !auth.user?.id ||
            (!selectedFriend?.id && params.friendId && !editingExpenseId) ||
            !description.trim() ||
            !amount.trim() ||
            !selectedSplitOption
        ) {
            Alert.alert("Campos em falta", "Verifique todos os campos.");
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

        try {
            const expensePayload = {
                user_id: auth.user.id,
                friend_id: selectedFriend?.id,
                description: description.trim(),
                total_amount: numericAmount,
                user_share: userShare,
                date: expenseDate,
                paid_by_user: selectedSplitOption.user_pays_total,
                split_option_id: selectedSplitOption.id,
                updated_at: new Date().toISOString(),
            };
            console.log("[handleSaveExpense] A guardar despesa com payload:", expensePayload);
            console.log("[handleSaveExpense] editingExpenseId:", editingExpenseId);

            if (editingExpenseId) {
                await editExistingExpense(expensePayload, userShare);
            } else {
                await addNewExpense(expensePayload, userShare);
            }
            await AsyncStorage.setItem(EXPENSE_ADDED_OR_MODIFIED_SIGNAL_KEY,"true");

            setDescription("");
            setAmount("");
            setExpenseDate(new Date().toISOString());
            setSelectedSplitOption(null);
            // setEditingExpenseId(null);
            // setOriginalExpenseUserShare(null);
            setIsLoadingSplitOption(true);

            handleCustomBack();
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
        params,
        expenseDate,
        editingExpenseId,
        originalExpenseUserShare,
        handleCustomBack,
    ]);
    

    const canSaveChanges =
        description.trim() !== "" &&
        amount.trim() !== "" &&
        parseFloat(amount.replace(",", ".")) > 0 &&
        selectedSplitOption !== null &&
        !isLoadingSplitOption;

    useEffect(() => {
        console.log(`[setOptions Effect] Executando. canSaveChanges: ${canSaveChanges}, isSaving: ${isSaving}`);
        navigation.setOptions({
            headerShown: true,
            headerTitle: "Adicionar uma despesa",
            headerLeft: () =>
                Platform.OS === "ios" ? (
                    <TouchableOpacity
                        onPress={handleCustomBack}
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
                <Text style={[styles.infoText, { fontSize: 14 }]}>Escolha um amigo</Text>
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
            }} />

            {selectedFriend && (
                <View style={styles.friendSelector}>
                    <Text style={styles.withUserText}>Com:</Text>
                    {selectedFriend.avatarUrl && selectedFriend.avatarUrl !== 'placeholder' ? (
                        <Image source={{ uri: selectedFriend.avatarUrl }} style={styles.friendAvatar} />
                    ) : (<View style={styles.friendAvatarPlaceholder} />)}
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
                                    {
                                        expenseDate.split('T')[0] === new Date().toISOString().split('T')[0] ?
                                            'Hoje' : formatDateForDisplay(expenseDate)
                                    }
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
        </View>
    );
}

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
