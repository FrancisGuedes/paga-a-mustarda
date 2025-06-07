// app/(tabs)/friend/[friendId].tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Button,
    RefreshControl,
    Platform,
    StatusBar,
    Image,
    TouchableOpacity,
    Animated,
} from "react-native";
import {
    useLocalSearchParams,
    Stack,
    useFocusEffect,
    useRouter,
    useNavigation,
} from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../config/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../../context/AuthContext";
import { useCurrentFriend } from "../../../context/FriendContext";
import Swipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
    useAnimatedStyle,
    interpolate,
    SharedValue,
    Extrapolation
} from 'react-native-reanimated';
import { EXPENSE_DELETED_SIGNAL_KEY } from "./expense/[expenseId]";
import { EXPENSE_ADDED_OR_MODIFIED_SIGNAL_KEY } from "@/app/add-expense-modal";

// Interface para Despesa
export interface Expense {
    id: string; // UUID da tabela Supabase
    user_id?: string; // UUID do utilizador logado
    friend_id?: string; // UUID do amigo (da tabela friends)
    description: string;
    total_amount: number; // Valor total da despesa
    user_share: number; // Positivo se o amigo deve ao user_id por esta despesa, negativo se user_id deve ao amigo
    date: string; // ou Date
    paid_by_user: boolean; // True se o user_id pagou, false se o friend_id pagou
    created_at?: string;
    updated_at?: string | null;
    split_option_id?: string; // ID da opção de divisão
    category_icon?: keyof typeof Ionicons.glyphMap;
}

// Interface para agrupar despesas por mês
interface GroupedExpenses {
    [monthYear: string]: Expense[];
}

export const EXPENSES_STORAGE_KEY_PREFIX = "paga_a_mostarda_expenses_cache_v3_";

const DELETE_BUTTON_WIDTH = 80; // Largura do botão de eliminar
//const FULL_SWIPE_DELETE_THRESHOLD = 300; // Largura mínima para considerar um swipe completo para eliminar
const DEFAULT_FRIEND_AVATAR = 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&size=100&rounded=true&name=';
const DEFAULT_SKELETON_COUNT = 3;

// Componente para a ação de swipe parcial e full
// const SwipeableDeleteAction_ZZZ = ({ dragX, onPress, itemHeight }: { dragX: SharedValue<number>, onPress: () => void, itemHeight: number }) => {
//     const animatedStyle = useAnimatedStyle(() => {
//         // O botão deve expandir-se à medida que se arrasta para além da sua largura inicial
//         const actualDragX = Math.abs(dragX.value);
//         const clampedDragX = Math.min(actualDragX, FULL_SWIPE_DELETE_THRESHOLD + 20); // Limita a expansão

//         const currentWidth = interpolate(
//             clampedDragX,
//             [0, DELETE_BUTTON_WIDTH, FULL_SWIPE_DELETE_THRESHOLD],
//             [DELETE_BUTTON_WIDTH, DELETE_BUTTON_WIDTH, clampedDragX], // Começa com DELETE_BUTTON_WIDTH e expande
//             Extrapolation.CLAMP
//         );

//         const translateX = interpolate(
//             dragX.value,
//             [- (FULL_SWIPE_DELETE_THRESHOLD + 20), -DELETE_BUTTON_WIDTH, 0],
//             [0, 0, DELETE_BUTTON_WIDTH + 20], // Ajusta para que o botão "siga" o dedo   
//             { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
//         );
//         return {
//             width: currentWidth, // Largura dinâmica
//             transform: [{ translateX: translateX }],
//             height: itemHeight,
//         };
//     });

//     return (
//         <TouchableOpacity onPress={onPress} style={[styles.deleteButtonTouchable, { height: itemHeight, width: 'auto' /* Para permitir que a Reanimated.View controle a largura */ }]}>
//             <Reanimated.View style={[styles.deleteButtonView, animatedStyle]}>
//                 <Ionicons name="trash-outline" size={28} color="white" />
//             </Reanimated.View>
//         </TouchableOpacity>
//     );
// };

// Componente para a ação de swipe parcial
const SwipeableDeleteAction = ({ dragX, onPress, itemHeight }: {
    dragX: SharedValue<number>,
    onPress: () => void,
    itemHeight: number
}) => {
    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            dragX.value,
            [-DELETE_BUTTON_WIDTH, 0],
            [0, DELETE_BUTTON_WIDTH],
            { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
        );
        return {
            transform: [{ translateX: translateX }],
            height: itemHeight,
        };
    });

    return (
        <TouchableOpacity onPress={onPress} style={[styles.deleteButtonTouchable, { height: itemHeight }]}>
            <Reanimated.View style={[styles.deleteButtonView, animatedStyle]}>
                <Ionicons name="trash-outline" size={28} color="white" />
            </Reanimated.View>
        </TouchableOpacity>
    );
};

// --- Componentes Skeleton ---
const SkeletonPlaceholder = ({ width, height, style, circle = false }: { width: number | string; height: number; style?: object, circle?: boolean }) => {
    const pulseAnim = useRef(new Animated.Value(0)).current; // Valor inicial para a animação

    useEffect(() => {
        const sharedAnimation = Animated.loop(
        Animated.sequence([
            Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700, // Duração da animação para ficar mais opaco
            useNativeDriver: true, // Importante para performance
            }),
            Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 700, // Duração da animação para ficar menos opaco
            useNativeDriver: true,
            }),
        ])
        );
        sharedAnimation.start();
        return () => {
        sharedAnimation.stop(); // Para a animação quando o componente é desmontado
        };
    }, [pulseAnim]);

    const animatedOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1], // Opacidade varia entre 0.5 e 1
    });

    return (
        <Animated.View 
        style={[
            { width, height, backgroundColor: '#E0E0E0', borderRadius: circle ? height / 2 : 4, opacity: animatedOpacity }, 
            style
        ]} 
        />
    );
};

const SkeletonExpenseItem = () => (
    <View style={[styles.expenseItem, styles.skeletonItem]}>
        <View style={styles.expenseDateContainer}>
            <SkeletonPlaceholder width={25} height={18} style={{ marginBottom: 2 }} />
            <SkeletonPlaceholder width={30} height={12} />
        </View>
        <View style={styles.expenseIconContainer}>
            <SkeletonPlaceholder width={24} height={24} style={{ borderRadius: 12 }} />
        </View>
        <View style={styles.expenseDetails}>
            <SkeletonPlaceholder width={'80%'} height={16} style={{ marginBottom: 4 }} />
            <SkeletonPlaceholder width={'60%'} height={12} />
        </View>
        <View style={styles.expenseShareContainer}>
            <SkeletonPlaceholder width={50} height={16} style={{ marginBottom: 4 }} />
            <SkeletonPlaceholder width={70} height={12} />
        </View>
    </View>
);

const SkeletonMonthSection = ({ monthYearPlaceholder, skeletonItemCount }: { monthYearPlaceholder: string, skeletonItemCount: number }) => (
    <View style={styles.monthSection}>
        <Text style={[styles.monthYearText, styles.skeletonMonthYearText]}>
            {monthYearPlaceholder}
        </Text>
        {Array.from({ length: skeletonItemCount }).map((_, index) => (
            <SkeletonExpenseItem key={`skeleton-exp-${index}`} />
        ))}
    </View>
);
// --- Fim Componentes Skeleton ---

export default function FriendExpensesScreen() {
    const {
        friendId: routeFriendId,
        name,
        avatarUrl: routeFriendAvatarUrl,
        registeredUserId: routeRegisteredFriendUserId,
        friendEmail: routeRegisteredFriendEmail,
    } = useLocalSearchParams<{
        friendId: string;
        name?: string;
        avatarUrl?: string;
        registeredUserId?: string;
        friendEmail?: string;
    }>();
    const { auth } = useAuth();
    const { setCurrentFriend } = useCurrentFriend();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const navigation = useNavigation();
    const swipeableRefs = useRef<{ [key: string]: SwipeableMethods | null }>({});
    const [itemHeights, setItemHeights] = useState<{ [key: string]: number }>({});
    const currentlyOpenSwipeableId = useRef<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // O nome do amigo é passado como parâmetro de query na navegação
    const friendName = name ? decodeURIComponent(name) : `Amigo ${routeFriendId}`;
    const friendFirstName = friendName.split(" ")[0];
    const friendAvatar = routeFriendAvatarUrl || `${DEFAULT_FRIEND_AVATAR}${friendFirstName.substring(0, 1)}`;
    const [skeletonItemCount, setSkeletonItemCount] = useState(DEFAULT_SKELETON_COUNT); 
    // Determina se o amigo é um utilizador registado da app
    const isFriendRegistered = !!routeRegisteredFriendUserId; 
    const friendEmail = routeRegisteredFriendEmail;

    //console.log(`Despesas com ${friendName}:`, expenses);

    const getExpensesStorageKey = useCallback(() => {
        if (!auth.user?.id || !routeFriendId) return null;
        return `${EXPENSES_STORAGE_KEY_PREFIX}${auth.user.id}_friend_${routeFriendId}`;
    }, [auth.user?.id, routeFriendId]);

    const fetchExpensesFromSupabase = async (
        userId: string,
        friendIdParam: string
    ) => {
        console.log(
            `[SupabaseFetch] A buscar despesas para user ID: ${userId} e friend ID: ${friendIdParam}`
        );
        try {
            // A query precisa buscar despesas onde o utilizador logado e o amigo estão envolvidos.
            // Assumimos que 'user_id' é quem criou/registou a despesa, e 'friend_id' é o outro participante.
            // Ou, uma estrutura mais flexível onde ambos os participantes estão listados.
            // Para este exemplo, vamos buscar onde (user_id=atual E friend_id=amigo) OU (user_id=amigo E friend_id=atual)
            // Esta query pode precisar de ajuste dependendo da sua estrutura exata da tabela 'expenses'
            // e de como define a relação da despesa com os dois utilizadores.
            // Por simplicidade, vamos manter a query anterior e assumir que 'user_id' é sempre o utilizador logado
            // e 'friend_id' é o amigo da página atual.
            const {
                data,
                error: supabaseError,
                status,
            } = await supabase
                .from("expenses")
                .select("*")
                .eq("user_id", userId) // Despesas onde o utilizador logado é o 'user_id'
                .eq("friend_id", friendIdParam) // E o amigo é o 'friend_id'
                .order("date", { ascending: false })

            console.log(
                `[SupabaseFetch] Resposta Supabase (despesas) - Status: ${status}, Erro:`,
                supabaseError
            );
            if (supabaseError) throw supabaseError;
            return data || [];
        } catch (e: any) {
            console.error("[SupabaseFetch] Exceção ao buscar despesas:", e);
            throw e;
        }
    };

    const loadExpenses = useCallback(async (
        options: { forceNetwork?: boolean; isPullToRefresh?: boolean, showSkeleton?: boolean } = {}
    ) => {
        const { forceNetwork = false, isPullToRefresh = false, showSkeleton = false } = options;
        const storageKey = getExpensesStorageKey();

        if (!auth.user?.id || !routeFriendId) {
            setExpenses([]);
            setLoading(false);
            setIsRefreshing(false);
            return;
        }
        const currentUserId = auth.user.id;

        if (isPullToRefresh) setIsRefreshing(true);
        else if (showSkeleton || expenses.length === 0 || forceNetwork) {
            setLoading(true);
            setExpenses([]);
        }
        setError(null);

        if (!forceNetwork && !isPullToRefresh && !showSkeleton && storageKey) {
            try {
                const cachedExpensesJson = await AsyncStorage.getItem(storageKey);
                if (cachedExpensesJson) {
                    const cachedExpenses = JSON.parse(cachedExpensesJson) as Expense[];
                    if (cachedExpenses.length > 0) {
                        setExpenses(cachedExpenses);
                        setSkeletonItemCount(cachedExpenses.length > 1 ? cachedExpenses.length : DEFAULT_SKELETON_COUNT); 
                        console.log("[cachedExpenses] Skeleton item count atualizado:", skeletonItemCount);
                    }
                }
            } catch (e) {
                console.error("[loadExpenses] Erro ao ler cache:", e);
            }
        } else if (forceNetwork && !isPullToRefresh && !showSkeleton) {
            setExpenses([]);
        }

        try {
            const dataFromSupabase = await fetchExpensesFromSupabase(currentUserId, routeFriendId);
            setExpenses(dataFromSupabase);
            //setSkeletonItemCount(dataFromSupabase.length > 1 ? dataFromSupabase.length : DEFAULT_SKELETON_COUNT); 
            if (storageKey) {
                try {
                    await AsyncStorage.setItem(
                        storageKey,
                        JSON.stringify(dataFromSupabase)
                    );
                } catch (e) {
                    console.error("[loadExpenses] Erro ao guardar no cache:", e);
                }
            }
        } catch (e: any) {
            const errorMessage = e.message || "Falha ao carregar despesas.";
            setError(errorMessage);
            if (expenses.length === 0 || isPullToRefresh || showSkeleton)
                Alert.alert("Erro", errorMessage);
            else console.warn("Falha ao atualizar, a usar cache:", errorMessage);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            //console.log("[loadExpenses finally] Skeleton item count atualizado:", skeletonItemCount);
        }
    }, [auth.user, routeFriendId, getExpensesStorageKey, expenses.length]
);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const checkSignalAndLoad = async () => {
                    if (routeFriendId && friendName) {
                    console.log(`[FriendExpensesScreen] Focado. Definindo amigo atual: ID=${routeFriendId}, Nome=${friendName}`);
                    console.log(`[FriendExpensesScreen] Focado. FRIEND_USER_ID=${routeRegisteredFriendUserId}`);
                    console.log(`[FriendExpensesScreen] Focado. EMAIL=${friendEmail}`);
                    setCurrentFriend({
                        id: routeFriendId,
                        name: friendName,
                        avatarUrl: routeFriendAvatarUrl,
                        registered_user_id: routeRegisteredFriendUserId,
                        email: routeRegisteredFriendEmail
                    });
                }

                /* if (auth.user && !auth.isLoading && routeFriendId) {
                        loadExpenses({ forceNetwork: expenses.length === 0 });
                    } else if (!auth.isLoading && !auth.user) {
                        setExpenses([]);
                        const storageKey = getExpensesStorageKey();
                        if(storageKey) AsyncStorage.removeItem(storageKey);
                        setLoading(false);
                    } */

                if (auth.user && !auth.isLoading && routeFriendId && isActive) {
                    //loadExpenses({ forceNetwork: expenses.length === 0 });
                    const deleteSignal = await AsyncStorage.getItem(EXPENSE_DELETED_SIGNAL_KEY);
                    const updateSignal = await AsyncStorage.getItem(EXPENSE_ADDED_OR_MODIFIED_SIGNAL_KEY);

                    if (deleteSignal === 'true' || updateSignal === 'true') {
                        await AsyncStorage.removeItem(EXPENSE_DELETED_SIGNAL_KEY);
                        await AsyncStorage.removeItem(EXPENSE_ADDED_OR_MODIFIED_SIGNAL_KEY);

                        console.log("[FriendExpensesScreen] Sinal de eliminação encontrado, a forçar recarregamento com skeleton.");
                        // Guarda o número atual de despesas (do cache ou estado anterior) para o skeleton
                        setSkeletonItemCount(expenses.length > 0 ? expenses.length : DEFAULT_SKELETON_COUNT);
                        loadExpenses({ forceNetwork: true, showSkeleton: true });
                    } else {
                        loadExpenses({ forceNetwork: expenses.length === 0 });
                    }
                } else if (!auth.isLoading && !auth.user && isActive) {
                    setExpenses([]);
                    const storageKey = getExpensesStorageKey();
                    if (storageKey) AsyncStorage.removeItem(storageKey);
                    setLoading(false);
                }
            }
            
            checkSignalAndLoad();
            return () => {
                isActive = false;
                console.log(
                    "[FriendExpensesScreen] Desfocado/Desmontado. Limpando amigo atual do contexto."
                );
                setCurrentFriend(null); // Limpa o amigo atual ao sair do ecrã
            };
        }, [
            auth.user,
            auth.isLoading,
            routeFriendId,
            friendName,
            routeFriendAvatarUrl,
            setCurrentFriend,
            loadExpenses,
            expenses.length,
            getExpensesStorageKey,
            routeRegisteredFriendUserId,
            routeRegisteredFriendEmail
        ])
        //}, [auth.user, auth.isLoading, routeFriendId, loadExpenses, getExpensesStorageKey, expenses.length])
    );

    const onRefresh = useCallback(() => {
        if (auth.user && !auth.isLoading && routeFriendId) {
            loadExpenses({ forceNetwork: true, isPullToRefresh: true });
        }
    }, [auth.user, auth.isLoading, routeFriendId, loadExpenses]);

    const confirmAndDeleteExpense = (expenseId: string, userShareToReverse: number) => {
        Alert.alert(
            "Eliminar Despesa",
            "Tem a certeza que quer eliminar esta despesa? Esta ação vai remover esta despesa para TODOS os utilizadores envolvidos e não apenas para si",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                    onPress: () => swipeableRefs.current[expenseId]?.close()
                },
                {
                    text: "Ok",
                    style: "destructive",
                    onPress: async () => {
                        await performDeleteAndReload(expenseId, userShareToReverse);
                    }
                }
            ]
        );
    };

    const performDeleteAndReload = async (expenseId: string, userShareToReverse: number) => {
        setIsDeleting(true);

        console.log("A eliminar despesa ID:", expenseId);
        // Fechar o swipeable antes de eliminar, se ainda não estiver fechado
        swipeableRefs.current[expenseId]?.close();

        setSkeletonItemCount(expenses.length > 1 ? expenses.length : DEFAULT_SKELETON_COUNT); 

        const { error: deleteError } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);

        if (deleteError) {
            Alert.alert("Erro", "Não foi possível eliminar a despesa.");
            console.error("Erro ao eliminar despesa:", deleteError);
            setIsDeleting(false);
            return;
        }

        const expensesBeforeDelete = expenses;
        setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));

        const updatedExpenses = expenses.filter(exp => exp.id !== expenseId);
        setExpenses(updatedExpenses);

        try {
            if (auth.user?.id && routeFriendId) {
                const { data: friendData, error: friendFetchError } = await supabase
                    .from('friends')
                    .select('balance')
                    .eq('user_id', auth.user.id)
                    .eq('id', routeFriendId)
                    .single();

                if (friendFetchError && friendFetchError.code !== 'PGRST116') 
                    throw friendFetchError;
                const currentFriendBalance = friendData?.balance || 0;
                const newFriendBalance = currentFriendBalance - userShareToReverse;

                const { error: friendUpdateError } = await supabase
                    .from('friends')
                    .update({ balance: newFriendBalance, updated_at: new Date().toISOString() })
                    .eq('user_id', auth.user.id)
                    .eq('id', routeFriendId)
                    .throwOnError();

                if (friendUpdateError) throw friendUpdateError;

                console.log("Saldo do amigo atualizado após eliminação para:", newFriendBalance);
            }
            const storageKey = getExpensesStorageKey();
            if (storageKey) {
                const updatedExpensesForCache = expensesBeforeDelete.filter(exp => exp.id !== expenseId);
                await AsyncStorage.setItem(storageKey, JSON.stringify(updatedExpensesForCache));
            }
            console.log("Despesa eliminada e cache atualizado.");
            await loadExpenses({ forceNetwork: true, showSkeleton: true }); 
        } catch (e) {
            console.error("Erro durante operações pós-eliminação (saldo/cache):", e);
            // Reverter a UI se as operações pós-delete falharem? (Mais complexo)
            Alert.alert("Aviso", "Despesa eliminada, mas ocorreu um erro ao atualizar o saldo ou cache.");
            await loadExpenses({ forceNetwork: true });
        } finally {
            setIsDeleting(false);
            console.log("[performDeleteAndReload finally] Skeleton item count atualizado:", skeletonItemCount);
        }
        return true;
    };

    /* Para usar no full SWIPE TO DELETE */
    /* const renderRightActions_ZZZ = (
        progress: SharedValue<number>,
        dragX: SharedValue<number>,
        expense: Expense
    ) => {
        return (
            <SwipeableDeleteAction
                dragX={dragX}
                itemHeight={itemHeights[expense.id] || styles.expenseItem.paddingVertical * 2 + 40}
                onPress={() => {
                    confirmAndDeleteExpense(expense.id, expense.user_share);
                }}
            />
        );
    }; */

    const renderRightActions = (
        progress: SharedValue<number>,
        dragX: SharedValue<number>,
        expense: Expense
    ) => {
        return (
            <SwipeableDeleteAction
                dragX={dragX}
                itemHeight={itemHeights[expense.id] || styles.expenseItem.minHeight || 70}
                onPress={() => {
                    confirmAndDeleteExpense(expense.id, expense.user_share);
                }}
            />
        );
    };

    const handleSwipeableWillOpen = (expenseId: string) => {
        // Fecha qualquer outro swipeable que esteja aberto
        if (currentlyOpenSwipeableId.current && currentlyOpenSwipeableId.current !== expenseId) {
            swipeableRefs.current[currentlyOpenSwipeableId.current]?.close();
        }
        // Não define o currentlyOpenSwipeableId.current aqui, pois onSwipeableOpen fará isso
        // se o swipe for para a direção correta (esquerda, para revelar rightActions).
    };

    const handleSwipeableOpen = (expenseId: string, direction: 'left' | 'right') => {
        // Chamado quando o swipeable assenta no estado aberto
        if (direction === 'left') { // Ações da direita foram abertas
            // Se já havia um aberto e não é este, o handleSwipeableWillOpen já o deve ter fechado.
            // Apenas atualiza qual está aberto agora.
            console.log(`Swipeable ${expenseId} aberto para a esquerda.`);
            currentlyOpenSwipeableId.current = expenseId;
        } else if (direction === 'right') {
            // Se abrir para a direita (não deveria acontecer com a config atual), fecha-o
            swipeableRefs.current[expenseId]?.close();
            if (currentlyOpenSwipeableId.current === expenseId) {
                currentlyOpenSwipeableId.current = null;
            }
        }
    };

    const handleSwipeableClose = (expenseId: string) => {
        // Chamado quando o swipeable é fechado (por programa ou pelo utilizador)
        console.log(`Swipeable ${expenseId} fechado.`);
        if (currentlyOpenSwipeableId.current === expenseId) {
            currentlyOpenSwipeableId.current = null;
        }
    };

    const handleResendInvite = useCallback(async () => {
        if (!friendEmail) {
            Alert.alert("Sem Email", "Não é possível reenviar o convite porque este amigo não tem um email associado.");
            return;
        }
        Alert.alert(
            "Reenviar Convite",
            `Reenviar convite para ${friendEmail}?`,
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "OK",
                    onPress: async () => {
                        try {
                            const inviterName = auth.user?.displayName || auth.user?.email || "Um amigo";
                            // console.log("[handleResendInvite] friendEmail:", friendEmail);
                            // console.log("[handleResendInvite] inviterName:", inviterName);
                            const bodyPayload = {
                                toEmail: friendEmail,
                                toName: inviterName || friendEmail?.split('@')[0] || 'Utilizador',
                                nome: inviterName,
                                link: "https://www.google.com", // TODO: alterar para APP
                            };
                            const { data, error } = await supabase.functions
                                .invoke('resend-invitation-friend-email', {
                                    body: bodyPayload,
                            });
                            if (error) throw error;
                            //Alert.alert("Sucesso", "O convite foi reenviado!");
                            //console.log("Resposta da Edge Function:", data);
                        } catch (error: any) {
                            console.error("Erro ao invocar a Edge Function 'invite-friend-email':", error);
                            Alert.alert("Erro", `Não foi possível reenviar o convite: ${error.message}`);
                        }
                    }
                }
            ]
        );
    }, [auth.user, friendEmail, friendName]);

    // Calcula o saldo com este amigo específico usando user_share
    const balanceWithFriend = expenses.reduce(
        (acc, expense) => acc + expense.user_share,
        0
    );

    //let balanceSummaryText = `Contas acertadas com ${friendFirstName}.`;

    //console.log("[LISTA DESPESAS] routeRegisteredFriendEmail:", routeRegisteredFriendEmail);
    let balanceSummaryText = isFriendRegistered ? 
    (expenses.length === 0 ? `Ainda não há despesas com ${friendFirstName}.` : `Contas acertadas com ${friendFirstName}.`) : 
    (routeRegisteredFriendEmail || 'Contacto não registado');
    let balanceSummaryColor = styles.settledColorText;

    if (isFriendRegistered && expenses.length > 0) {
        if (balanceWithFriend > 0) { 
            balanceSummaryText = `${friendFirstName} deve-lhe ${balanceWithFriend.toFixed(2)} €`; 
            balanceSummaryColor = styles.positiveBalanceColor; 
        } 
        else if (balanceWithFriend < 0) { 
            balanceSummaryText = `Deve a ${friendFirstName} ${Math.abs(balanceWithFriend).toFixed(2)} €`; 
            balanceSummaryColor = styles.negativeBalanceColor; }
    } else if (!isFriendRegistered) {
        balanceSummaryColor = styles.warningColorText;
    }

    /* if (balanceWithFriend > 0) {
        // Amigo deve-me
        balanceSummaryText = `${friendFirstName} deve-lhe ${balanceWithFriend.toFixed(
            2
        )} €`;
        balanceSummaryColor = styles.positiveBalanceColor;
    } else if (balanceWithFriend < 0) {
        // Eu devo ao amigo
        balanceSummaryText = `Deve a ${friendFirstName} ${Math.abs(
            balanceWithFriend
        ).toFixed(2)} €`;
        balanceSummaryColor = styles.negativeBalanceColor;
    } */

    // Agrupar despesas por mês/ano
    const groupedExpenses = expenses.reduce((acc, expense) => {
        const date = new Date(expense.date);
        const monthYear = `${date.toLocaleString("pt-PT", {
            month: "long",
        })} ${date.getFullYear()}`;
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(expense);
        return acc;
    }, {} as GroupedExpenses);

    // VALIDAR A VAR NO GEMINI
    const monthSections = Object.keys(groupedExpenses).sort((a, b) => {
        const [monthA, yearA] = a.split(" ");
        const [monthB, yearB] = b.split(" ");
        const dateA = new Date(
            parseInt(yearA, 10),
            new Date(Date.parse(monthA + " 1, 2012")).getMonth()
        );
        const dateB = new Date(
            parseInt(yearB, 10),
            new Date(Date.parse(monthB + " 1, 2012")).getMonth()
        );
        return dateB.getTime() - dateA.getTime();
    }); // Ordenar por data mais recente

    // Ecrã de Loading inicial
    if (auth.isLoading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>A verificar autenticação...</Text>
            </View>
        );
    }
    if (!auth.user) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>Precisa de estar logado.</Text>
            </View>
        );
    }

    if ((loading || isDeleting) && !isRefreshing) {
        return (
            <View style={[styles.outerContainer, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ title: friendName, headerStyle: { backgroundColor: '#4A90E2' }, headerTintColor: '#fff' }} />
                {/* Cabeçalho e botões de ação podem ser mostrados mesmo durante o skeleton loading */}
                <View style={styles.customHeader}>
                    <View style={styles.headerContent}>
                        {/* <Image source={{ uri: friendAvatar }} style={styles.headerAvatar} /> */}
                        <Text style={styles.headerFriendName}>{friendName}</Text>
                        <SkeletonPlaceholder width={120} height={18} style={{ marginTop: 4 }} />
                        {!isFriendRegistered && (
                            <SkeletonPlaceholder width={150} height={30} style={{ marginTop: 10, borderRadius: 15 }} />
                        )}
                    </View>
                    <TouchableOpacity style={styles.settingsIcon}>
                        <Feather name="settings" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={[styles.actionButton, styles.liquidarButton]}>
                        <Text style={[styles.actionButtonText, styles.liquidarButtonText]}>Liquidar contas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.lembrarButton]}>
                        <Text style={styles.actionButtonText}>Lembrar...</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.graficosButton]}>
                        <Ionicons name="stats-chart-outline" size={18} color="#4A90E2" />
                        <Text style={[styles.actionButtonText, { color: '#4A90E2', marginLeft: 5 }]}>Gráficos</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollViewStyle} contentContainerStyle={styles.scrollContentContainer}>
                    <SkeletonMonthSection 
                        monthYearPlaceholder="" 
                        skeletonItemCount={skeletonItemCount} 
                    />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.outerContainer, { paddingTop: insets.top }]}>
            <Stack.Screen
                options={{
                    title: friendName,
                    headerStyle: { backgroundColor: "#4A90E2" },
                    headerTintColor: "#fff",
                }}
            />

            <View style={styles.customHeader}>
                {/* <ImageBackground source={require('../../../assets/images/header-bg.png')} style={styles.headerBackground}> */}
                <View style={styles.headerContent}>
                    {/* <Image source={{ uri: `${DEFAULT_FRIEND_AVATAR}${friendName.charAt(0)}&size=128` }} style={styles.headerAvatar} /> */}
                    <Text style={styles.headerFriendName}>{friendName}</Text>
                    <Text style={[styles.headerBalanceSummary, balanceSummaryColor]}>
                        {balanceSummaryText} {!isFriendRegistered && routeRegisteredFriendEmail && (
                        <Ionicons name="warning-sharp" style={{ marginLeft: 5 }} size={18} color={styles.warningColorText.color} />
                    )}
                    </Text>
                    
                </View>
                {!isFriendRegistered && (
                    <TouchableOpacity 
                        style={styles.inviteButton} 
                        onPress={handleResendInvite}>
                        <Text style={styles.inviteButtonText}>Reenviar convite</Text>
                    </TouchableOpacity>
                )}
                {/* </ImageBackground> */}
                <TouchableOpacity style={styles.settingsIcon}>
                    <Feather name="settings" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={[styles.actionButton, styles.liquidarButton]}>
                    <Text style={[styles.actionButtonText, styles.liquidarButtonText]}>
                        Liquidar contas
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.lembrarButton]}>
                    <Text style={styles.actionButtonText}>Lembrar...</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.graficosButton]}>
                    <Ionicons name="stats-chart-outline" size={18} color="#4A90E2" />
                    <Text
                        style={[
                            styles.actionButtonText,
                            { color: "#4A90E2", marginLeft: 5 },
                        ]}
                    >
                        Gráficos
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollViewStyle}
                contentContainerStyle={styles.scrollContentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        colors={["#4A90E2"]}
                        tintColor={"#4A90E2"}
                    />
                }
            >
                {/* {monthSections.length === 0 && !loading && (
                    <Text style={styles.noExpensesText}>
                        {error
                            ? `Erro: ${error}`
                            : `Ainda não há despesas com ${friendName}.`}
                    </Text>
                )} */}

                {expenses.length === 0 && !loading && !isRefreshing && (
                    <View style={styles.noExpensesContent}>
                        <Ionicons name="document-text-outline" size={60} color="#CEDAEF" style={{marginBottom: 20}} />
                        <Text style={styles.noExpensesTitle}>Ainda não há despesas.</Text>
                        <Text style={styles.noExpensesSubtitle}>
                            Toque no botão de adição abaixo para adicionar uma despesa com este amigo.
                        </Text>
                        {/* A seta é mais difícil de replicar exatamente, pode usar um ícone ou texto */}
                    </View>
                )}
                {error && monthSections.length === 0 && (
                    <Button
                        title="Tentar Novamente"
                        onPress={() =>
                            loadExpenses({ forceNetwork: true, isPullToRefresh: true })
                        }
                    />
                )}

                {monthSections.map((monthYear) => (
                    <View key={monthYear} style={styles.monthSection}>
                        <Text style={styles.monthYearText}>
                            {monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}
                        </Text>
                        {groupedExpenses[monthYear].map((expense) => {
                            const expenseDate = new Date(expense.date);
                            const day = expenseDate.getDate();
                            const monthAbbrev = expenseDate
                                .toLocaleString("pt-PT", { month: "short" })
                                .replace(".", "");
                            const userShareAbs = Math.abs(expense.user_share).toFixed(2);
                            const shareColor =
                                expense.user_share > 0
                                    ? styles.positiveAmountColor
                                    : styles.negativeAmountColor;
                            const shareText =
                                expense.user_share > 0 ? "emprestou" : "emprestaram-lhe";

                            return (

                                <Swipeable
                                    key={expense.id}
                                    ref={ref => { if (ref) swipeableRefs.current[expense.id] = ref; }}
                                    renderRightActions={(progress, dragX) =>
                                        renderRightActions(
                                            progress as unknown as SharedValue<number>,
                                            dragX as unknown as SharedValue<number>,
                                            expense
                                        )
                                    }
                                    // Removidas as props para o full swipe para focar no botão
                                    // rightThreshold={FULL_SWIPE_DELETE_THRESHOLD} 
                                    // onSwipeableWillOpen={(direction: SwipeDirection) => {
                                    //   if (direction === 'left') {
                                    //     runOnJS(confirmAndDeleteExpense)(expense.id, expense.user_share);
                                    //   }
                                    // }}
                                    onSwipeableWillOpen={() => handleSwipeableWillOpen(expense.id)} // ATUALIZADO
                                    onSwipeableOpen={(direction) => handleSwipeableOpen(expense.id, direction as 'left' | 'right')}
                                    onSwipeableClose={() => handleSwipeableClose(expense.id)}
                                    overshootLeft={false} // Impede overshoot para a esquerda (revelando left actions)
                                    overshootRight={true}
                                    friction={1}
                                    // leftThreshold define quão longe precisa arrastar para as RightActions ficarem abertas
                                    leftThreshold={DELETE_BUTTON_WIDTH / 2} // Abrir o botão com um swipe menor
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            if (currentlyOpenSwipeableId.current) {
                                                swipeableRefs.current[currentlyOpenSwipeableId.current]?.close();
                                            }
                                            router.push({
                                                pathname:
                                                    "/friend/expense/[expenseId]", // Navega para a sub-rota de detalhe
                                                params: {
                                                    expenseId: expense.id,
                                                    friendId: routeFriendId,
                                                    friendName: friendName,
                                                    routeRegisteredFriendUserId: routeRegisteredFriendUserId,
                                                    routeRegisteredFriendEmail: routeRegisteredFriendEmail
                                                },
                                            });
                                        }}
                                    >
                                        <View
                                            style={styles.expenseItem}
                                            onLayout={(event) => {
                                                const { height } = event.nativeEvent.layout;
                                                if (typeof height === 'number' && !isNaN(height)) {
                                                    setItemHeights(prev => ({ ...prev, [expense.id]: height }));
                                                }
                                            }}
                                        >
                                            <View style={styles.expenseDateContainer}>
                                                <Text style={styles.expenseDay}>{day}</Text>
                                                <Text style={styles.expenseMonth}>{monthAbbrev}</Text>
                                            </View>
                                            <View style={styles.expenseIconContainer}>
                                                <Ionicons
                                                    name={expense.category_icon || "receipt-outline"}
                                                    size={24}
                                                    color="#4F4F4F"
                                                />
                                            </View>
                                            <View style={styles.expenseDetails}>
                                                <Text
                                                    style={styles.expenseDescription}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {expense.description}
                                                </Text>
                                                <Text style={styles.paidByText}>
                                                    {expense.paid_by_user
                                                        ? `Pagou ${expense.total_amount.toFixed(2)} €`
                                                        : `${friendFirstName} pagou ${expense.total_amount.toFixed(
                                                            2
                                                        )} €`}
                                                </Text>
                                            </View>
                                            <View style={styles.expenseShareContainer}>
                                                <Text style={[styles.expenseShareAmount, shareColor]}>
                                                    {userShareAbs} €
                                                </Text>
                                                <Text style={[styles.expenseShareLabel, shareColor]}>
                                                    {shareText}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Swipeable>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF", // Fundo geral do ecrã
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F4F6F8",
        paddingHorizontal: 20,
    },
    errorText: {
        color: "red",
        fontSize: 16,
        textAlign: "center",
    },
    customHeader: {
        backgroundColor: "#fff", // Cor de fundo do header personalizado (simulando a imagem)
        paddingTop: 10, // Espaço para a barra de status já tratada pelo insets.top na View externa
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: "center",
        // Se quiser uma ImageBackground, adicione aqui
    },
    headerContent: {
        alignItems: "center",
    },
    headerAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#CEDAEF", // Cor de placeholder se a imagem não carregar
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#fff",
    },
    headerFriendName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    headerBalanceSummary: {
        fontSize: 14,
        color: "#fff", // A cor específica (verde/vermelho) será aplicada via style inline
    },
    positiveBalanceColor: { color: "#E0F8E0" }, // Um verde claro para texto branco
    negativeBalanceColor: { color: "#FFE0E0" }, // Um vermelho claro para texto branco
    settledColorText: { color: "#D0E0FF" }, // Um azul claro para texto branco
    settingsIcon: {
        position: "absolute",
        top: 15, // Ajustar conforme o padding da safe area
        right: 15,
        padding: 5,
        color: "#333",
    },
    actionButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 15,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#EAEAEA",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20, // Botões mais arredondados
    },
    liquidarButton: {
        backgroundColor: "#FF6B6B", // Cor laranja/vermelha da imagem
    },
    liquidarButtonText: {
        color: "#fff",
    },
    lembrarButton: {
        backgroundColor: "#F0F0F0", // Cinza claro
    },
    graficosButton: {
        backgroundColor: "#E0EFFF", // Azul claro
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
    },
    scrollViewStyle: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 80, // Espaço para o FAB
    },
    monthSection: {
        marginTop: 20,
    },
    monthYearText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        paddingHorizontal: 16,
        marginBottom: 10,
        textTransform: "uppercase",
    },
    expenseItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12, // Mantido para o cálculo da altura de fallback
        paddingHorizontal: 16,
        marginHorizontal: 10,
        marginBottom: 1,
        alignItems: 'center',
        minHeight: 70, // Altura mínima para consistência
    },
    expenseDateContainer: {
        alignItems: "center",
        marginRight: 12,
        width: 40, // Largura fixa para alinhar
    },
    expenseDay: {
        fontSize: 17,
        fontWeight: "bold",
        color: "#333",
    },
    expenseMonth: {
        fontSize: 12,
        color: "#777",
        textTransform: "uppercase",
    },
    expenseIconContainer: {
        marginRight: 12,
        backgroundColor: "#f0f0f0", // Fundo do ícone
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    expenseDetails: {
        flex: 1,
    },
    expenseDescription: {
        fontSize: 15,
        fontWeight: "500",
        color: "#333",
    },
    paidByText: {
        fontSize: 13,
        color: "#777",
        marginTop: 2,
    },
    expenseShareContainer: {
        alignItems: "flex-end",
        marginLeft: 10,
    },
    expenseShareAmount: {
        fontSize: 15,
        fontWeight: "bold",
    },
    expenseShareLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    positiveAmountColor: {
        // Emprestou (amigo deve)
        color: "#27ae60",
    },
    negativeAmountColor: {
        // Emprestaram-lhe (você deve)
        color: "#e74c3c",
    },
    noExpensesText: {
        textAlign: "center",
        marginTop: 50,
        fontSize: 16,
        color: "#777",
        paddingHorizontal: 20,
    },
    fab: {
        position: "absolute",
        margin: 16,
        right: 16,
        bottom: 16,
        backgroundColor: "#FF6B6B", // Cor do botão de liquidar
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    deleteButtonTouchable: {
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        width: DELETE_BUTTON_WIDTH,
    },
    deleteButtonView: {
        height: '100%',
        width: DELETE_BUTTON_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonMonthYearText: {
        backgroundColor: '#E0E0E0',
        width: '40%',
        height: 16,
        borderRadius: 4,
        marginBottom: 15, // Espaço extra
    },
    skeletonItem: { // Para dar um aspeto de "loading" ao item
        backgroundColor: '#F0F0F0', // Cor de fundo do esqueleto
        opacity: 0.7,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    actualLoadingBox: { // Para o conteúdo dentro do BlurView
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.7)', // Fundo escuro para o spinner e texto
        borderRadius: 10,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        color: '#FFFFFF',
        fontSize: 16, // Ajustado
        fontWeight: '500',
    },
    warningColorText: { // Cor para o email e ícone de alerta
        color: '#FFA500', // Laranja/Amarelo para aviso
    },
    inviteButton: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderRadius: 20,
        borderColor: '#333',
        borderWidth: 1,
    },
    inviteButtonText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
    },
    noExpensesContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
        noExpensesTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
        noExpensesSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
});
