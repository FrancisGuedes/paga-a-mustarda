// app/(tabs)/friend/expense/[expenseId].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Platform, ActivityIndicator, Button, KeyboardAvoidingView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../../config/supabase'; // Ajuste o caminho
import { useAuth } from '../../../../context/AuthContext'; // Ajuste o caminho
import type { Expense } from '../[friendId]'; // Importa a interface Expense do ecrã anterior

const DEFAULT_USER_AVATAR = 'https://via.placeholder.com/80/007AFF/FFFFFF?Text=EU';
const DEFAULT_FRIEND_AVATAR_DETAIL = 'https://via.placeholder.com/80/CEDAEF/000000?Text=';

// --- Componentes Skeleton ---
const SkeletonPlaceholder = ({ width, height, style, circle = false }: { width: number | string; height: number; style?: object, circle?: boolean }) => (
    <View style={[{ width, height, backgroundColor: '#E9E9EF', borderRadius: circle ? height / 2 : 6 }, style]} />
);
const SkeletonExpenseDetail = () => {
    const insets = useSafeAreaInsets(); // Para o padding do ecrã de loading
    return (
        <View style={[styles.screenContainer]}>
            <Stack.Screen options={{ title: "Detalhes" }} />

            <View style={styles.mainInfoContainer}>
                <View style={styles.mainInfoTopRow}>
                    <SkeletonPlaceholder width={56} height={56} style={styles.iconBackgroundSkeleton} circle={false} />
                    <View style={styles.mainInfoTextContainer}>
                        <SkeletonPlaceholder width={'80%'} height={22} style={{ marginBottom: 9 }} />
                        <SkeletonPlaceholder width={'50%'} height={28} style={{ marginBottom: 10 }} />
                        <SkeletonPlaceholder width={'60%'} height={13} />
                    </View>
                </View>
            </View>

            <View style={styles.paymentDetailsContainer}>
                <View style={styles.paidBySection}>
                    <SkeletonPlaceholder width={40} height={40} circle={true} style={styles.detailAvatarSkeleton} />
                    <SkeletonPlaceholder width={'70%'} height={18} />
                </View>
                <View style={styles.paidBySection}>
                    <SkeletonPlaceholder width={30} height={30} circle={true} style={styles.splitAvatar} />
                    <SkeletonPlaceholder width={'60%'} height={17} />
                </View>
                <View style={styles.paidBySection}>
                    <SkeletonPlaceholder width={30} height={30} circle={true} style={styles.splitAvatar} />
                    <SkeletonPlaceholder width={'60%'} height={17} />
                </View>
            </View>
        </View>
    );
};
// --- Fim Componentes Skeleton ---

export default function ExpenseDetailScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{
        expenseId: string;
        friendId?: string;
        friendName?: string;
    }>();
    const { auth } = useAuth();
    const insets = useSafeAreaInsets();

    const [expense, setExpense] = useState<Expense | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const friendName = params.friendName ? decodeURIComponent(params.friendName) : 'Amigo';
    const friendAvatar = `${DEFAULT_FRIEND_AVATAR_DETAIL}${friendName.charAt(0)}`;
    // Para o avatar do utilizador logado, pode usar o do auth.user se existir, ou um default
    const userAvatar = DEFAULT_USER_AVATAR; // Supondo que auth.user pode ter photoURL

    const fetchExpenseDetails = useCallback(async () => {
        if (!params.expenseId) {
            setError("ID da despesa em falta.");
            setLoading(false);
            return;
        }
        console.log(`[ExpenseDetail] A buscar detalhes para despesa ID: ${params.expenseId}`);
        setLoading(true);
        setError(null);
        try {
            const { data, error: supabaseError } = await supabase
                .from('expenses')
                .select('*')
                .eq('id', params.expenseId)
                .single(); // Esperamos apenas uma despesa

            if (supabaseError) throw supabaseError;
            if (!data) throw new Error("Despesa não encontrada.");

            setExpense(data as Expense);
        } catch (e: any) {
            console.error("[ExpenseDetail] Erro ao buscar detalhes da despesa:", e);
            setError(e.message || "Falha ao carregar detalhes da despesa.");
            Alert.alert("Erro", e.message || "Falha ao carregar detalhes da despesa.");
        } finally {
            setLoading(false);
        }
    }, [params.expenseId]);

    useEffect(() => {
        fetchExpenseDetails();
    }, [fetchExpenseDetails]);

    const handleBackPress = useCallback(() => {
        if (router.canGoBack() && params.friendId && params.friendName) {
            router.replace({
                pathname: "/(tabs)/friend/[friendId]",
                params: { friendId: params.friendId, name: params.friendName }
            });
        } else {
            router.back();
        }
    }, [router]);

    // Configurar o header dinamicamente
    useEffect(() => {
        console.log("[ExpenseDetail] expense:", expense);
        navigation.setOptions({
            headerShown: true,
            headerTitleAlign: 'center',
            headerTitle: "Detalhes",
            headerLeft: () => (
                <TouchableOpacity
                    onPress={handleBackPress}
                    style={styles.headerIconButton}
                >
                    <Ionicons name="chevron-back" size={24} color={Platform.OS === 'ios' ? '#000' : '#000'} />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <View style={styles.headerRightContainer}>
                    <TouchableOpacity
                        onPress={() => Alert.alert("Eliminar", `Eliminar despesa: ${expense?.description}?`)}
                        style={styles.headerIconButton}
                    >
                        <Ionicons name="trash-outline" size={24} color={Platform.OS === 'ios' ? '#000' : '#000'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => Alert.alert("Editar", `Editar despesa: ${expense?.description}?`)}
                        style={styles.headerIconButton}
                    >
                        <Feather name="edit-2" size={23} color={Platform.OS === 'ios' ? '#000' : '#000'} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, expense, router]);


    if (isLoading || !expense) {
        return <SkeletonExpenseDetail />;
    }
    if (error) {
        return <View style={styles.loadingContainer}><Text style={styles.errorText}>{error}</Text><Button title="Tentar Novamente" onPress={fetchExpenseDetails} /></View>;
    }
    if (!expense) {
        return <View style={styles.loadingContainer}><Text>Despesa não encontrada.</Text></View>;
    }

    // Lógica para determinar os textos de "Deve a" e "X deve"
    const expenseDate = new Date(expense.date);
    const formattedDate = `${expenseDate.toLocaleDateString('pt-PT', { day: 'numeric' })} de ${expenseDate.toLocaleDateString('pt-PT', { month: 'long' })} de ${expenseDate.getFullYear()}`;
    const whoAdded = expense.paid_by_user ? "si" : friendName.split(' ')[0]; // Simplificado

    // user_share: Positivo se o amigo deve ao user_id, negativo se user_id deve ao amigo
    const userOwesAmount = expense.user_share < 0 ? Math.abs(expense.user_share) : 0;
    const friendOwesAmount = expense.user_share > 0 ? expense.user_share : 0;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
            <ScrollView style={[styles.screenContainer, { paddingTop: 0 /* O header da Stack já trata do inset */ }]}>
                <View style={styles.mainInfoContainer}>
                    <View style={styles.mainInfoTopRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={expense.category_icon || "receipt-outline"} size={28} color="#4F4F4F" />
                        </View>
                        <View style={styles.mainInfoTextContainer}>
                            <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">{expense.description}</Text>
                            <Text style={styles.totalAmountText}>{expense.total_amount.toFixed(2)} €</Text>
                            <Text style={styles.addedByText}>Adicionado por {whoAdded} em {formattedDate}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.paymentDetailsContainer}>
                    <View style={styles.paidBySection}>
                        <Image source={{ uri: expense.paid_by_user ? userAvatar : friendAvatar }} style={styles.payerAvatar} />
                        <Text style={styles.paidByTextDetail}>
                            {expense.paid_by_user ? "Pagou" : `${friendName.split(' ')[0]} pagou`} {expense.total_amount.toFixed(2)} €
                        </Text>
                    </View>

                    <View style={styles.splitDetailItem}>
                        <Image source={{ uri: userAvatar }} style={styles.splitAvatar} />
                        <Text style={styles.splitText}>
                            {userOwesAmount > 0 ? `Deve a ${userOwesAmount.toFixed(2)} €` : `${userOwesAmount.toFixed(2)} € para si`}
                        </Text>
                    </View>

                    <View style={styles.splitDetailItem}>
                        <Image source={{ uri: friendAvatar }} style={styles.splitAvatar} />
                        <Text style={styles.splitText}>
                            {friendOwesAmount > 0 ? `${friendName.split(' ')[0]} deve ${friendOwesAmount.toFixed(2)} €` : `${friendOwesAmount.toFixed(2)} € para ${friendName.split(' ')[0]}`}
                        </Text>
                    </View>
                </View>
                {/* Outros detalhes ou histórico da despesa podem ir aqui */}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingContainer: { flex: 1, },
    screenContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Fundo padrão iOS
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
    headerRightContainer: {
        flexDirection: 'row',
        marginRight: Platform.OS === 'ios' ? 0 : 10,
    },
    headerIconButton: {
        paddingHorizontal: 10, // Espaçamento para os botões do header
        paddingVertical: 5,
    },
    mainInfoContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 16,
        marginHorizontal: 0,
        marginTop: 20,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#E9E9EF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    descriptionText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#1C1C1E',
        //textAlign: 'center',
        marginBottom: 4,
    },
    totalAmountText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1C1C1E',
        //textAlign: 'center',
        marginBottom: 10,
    },
    addedByText: {
        fontSize: 13,
        color: '#8E8E93',
        //textAlign: 'center',
    },
    paymentDetailsContainer: {
        marginTop: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#C7C7CC',
    },
    paidBySection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    payerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#ffea61',
    },
    paidByTextDetail: {
        fontSize: 19,
        color: '#1C1C1E',
    },
    splitDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    splitAvatar: {
        width: 25,
        height: 25,
        borderRadius: 15,
        marginRight: 12,
        backgroundColor: '#D8D8D8',
    },
    splitText: {
        fontSize: 16,
        color: '#1C1C1E',
    },
    mainInfoTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Alinha o ícone e o texto no topo
        marginBottom: 10,
    },
    mainInfoTextContainer: {
        flex: 1,
    },
    mainInfoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 16,
        marginHorizontal: 16, marginTop: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    },
    iconBackgroundSkeleton: { // Adicionado para o skeleton
        marginRight: 12,
    },
    detailsSection: { backgroundColor: '#FFFFFF', borderRadius: 10, marginHorizontal: 16, marginTop: 20, paddingLeft: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, },
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, },
    detailAvatarSkeleton: { // Adicionado para o skeleton
        marginRight: 12,
    },
    separatorLine: { height: StyleSheet.hairlineWidth, backgroundColor: '#EAEAEA', marginLeft: 52 /* 40 (avatar) + 12 (margin) */ },

});
