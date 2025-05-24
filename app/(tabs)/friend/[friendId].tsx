// app/(tabs)/friend/[friendId].tsx
import React, { useState, useRef, useCallback } from "react";
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
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

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
    category_icon?: keyof typeof Ionicons.glyphMap;
}

// Interface para agrupar despesas por mês
interface GroupedExpenses {
    [monthYear: string]: Expense[];
}

const EXPENSES_STORAGE_KEY_PREFIX = "paga_a_mostarda_expenses_cache_v3_";

export default function FriendExpensesScreen() {
    const {
        friendId: routeFriendId,
        name,
        avatarUrl: routeFriendAvatarUrl,
    } = useLocalSearchParams<{
        friendId: string;
        name?: string;
        avatarUrl?: string;
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

    // O nome do amigo é passado como parâmetro de query na navegação
    const friendName = name ? decodeURIComponent(name) : `Amigo ${routeFriendId}`;
    const friendFirstName = friendName.split(" ")[0];

    console.log(`Despesas com ${friendName}:`, expenses);

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
                .order("date", { ascending: false });

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

    const loadExpenses = useCallback(
        async (
            options: { forceNetwork?: boolean; isPullToRefresh?: boolean } = {}
        ) => {
            const { forceNetwork = false, isPullToRefresh = false } = options;
            const storageKey = getExpensesStorageKey();

            if (!auth.user?.id || !routeFriendId) {
                setExpenses([]);
                setLoading(false);
                setIsRefreshing(false);
                return;
            }
            const currentUserId = auth.user.id;

            if (isPullToRefresh) setIsRefreshing(true);
            else if (expenses.length === 0 || forceNetwork) setLoading(true);
            setError(null);

            if (!forceNetwork && !isPullToRefresh && storageKey) {
                try {
                    const cachedExpensesJson = await AsyncStorage.getItem(storageKey);
                    if (cachedExpensesJson) {
                        const cachedExpenses = JSON.parse(cachedExpensesJson) as Expense[];
                        if (cachedExpenses.length > 0) {
                            setExpenses(cachedExpenses);
                            if (!isPullToRefresh) setLoading(false);
                        }
                    }
                } catch (e) {
                    console.error("[loadExpenses] Erro ao ler cache:", e);
                }
            } else if (forceNetwork && !isPullToRefresh) {
                setExpenses([]);
            }

            try {
                const dataFromSupabase = await fetchExpensesFromSupabase(
                    currentUserId,
                    routeFriendId
                );
                setExpenses(dataFromSupabase);
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
                if (expenses.length === 0 || isPullToRefresh)
                    Alert.alert("Erro", errorMessage);
                else console.warn("Falha ao atualizar, a usar cache:", errorMessage);
            } finally {
                setLoading(false);
                setIsRefreshing(false);
            }
        },
        [auth.user, routeFriendId, getExpensesStorageKey, expenses.length]
    );

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            if (routeFriendId && friendName) {
                console.log(
                    `[FriendExpensesScreen] Focado. Definindo amigo atual: ID=${routeFriendId}, Nome=${friendName}`
                );
                setCurrentFriend({
                    id: routeFriendId,
                    name: friendName,
                    avatarUrl: routeFriendAvatarUrl,
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
                loadExpenses({ forceNetwork: expenses.length === 0 });
            } else if (!auth.isLoading && !auth.user && isActive) {
                setExpenses([]);
                const storageKey = getExpensesStorageKey();
                if (storageKey) AsyncStorage.removeItem(storageKey);
                setLoading(false);
            }

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
        ])
        //}, [auth.user, auth.isLoading, routeFriendId, loadExpenses, getExpensesStorageKey, expenses.length])
    );

    const onRefresh = useCallback(() => {
        if (auth.user && !auth.isLoading && routeFriendId) {
            loadExpenses({ forceNetwork: true, isPullToRefresh: true });
        }
    }, [auth.user, auth.isLoading, routeFriendId, loadExpenses]);

    // Calcula o saldo com este amigo específico usando user_share
    const balanceWithFriend = expenses.reduce(
        (acc, expense) => acc + expense.user_share,
        0
    );

    let balanceSummaryText = `Contas acertadas com ${friendFirstName}.`;
    let balanceSummaryColor = styles.settledColorText;
    if (balanceWithFriend > 0) {
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
    }

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
    if (loading && expenses.length === 0) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>A carregar despesas com {friendName}...</Text>
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
                        {balanceSummaryText}
                    </Text>
                </View>
                {/* </ImageBackground> */}
                <TouchableOpacity style={styles.settingsIcon}>
                    <Feather name="settings" size={24} color="#fff" />
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
                {monthSections.length === 0 && !loading && (
                    <Text style={styles.noExpensesText}>
                        {error
                            ? `Erro: ${error}`
                            : `Ainda não há despesas com ${friendName}.`}
                    </Text>
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
                                <View key={expense.id} style={styles.expenseItem}>
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
        backgroundColor: "#F4F6F8", // Fundo geral do ecrã
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
        backgroundColor: "#4A90E2", // Cor de fundo do header personalizado (simulando a imagem)
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
        color: "#fff",
        marginBottom: 4,
    },
    headerBalanceSummary: {
        fontSize: 16,
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
        flexDirection: "row",
        backgroundColor: "#fff",
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 10, // Se quiser que os cards não toquem as bordas
        marginBottom: 1, // Para criar um efeito de linhas separadoras finas
        // Para um look de card, adicione borderRadius e um pequeno marginVertical
        // borderRadius: 8,
        // marginVertical: 5,
        alignItems: "center",
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
});
