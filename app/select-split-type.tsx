// app/select-split-type.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase'; // Ajuste o caminho

export interface SplitTypeOption {
    id: string;
    description_template: string;
    user_pays_total: boolean;
    split_type: 'EQUALLY' | 'USER_OWES_FRIEND_TOTAL' | 'FRIEND_OWES_USER_TOTAL';
    sort_order: number;
    created_at: string;
    description_template_to_be_mapped: string;
}

export default function SelectSplitTypeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ friendName?: string; currentOptionId?: string }>();
    const friendName = params.friendName || 'o amigo';
    const currentOptionId = params.currentOptionId;

    const [options, setOptions] = useState<SplitTypeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(currentOptionId);
    const insets = useSafeAreaInsets();

    const fetchSplitOptions = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expense_split_options')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setOptions(data || []);
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível carregar as opções de divisão.');
            console.error("Erro ao buscar opções de divisão:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSplitOptions();
    }, [fetchSplitOptions]);

    /* const handleSelectOption = (option: SplitTypeOption) => {
        setSelectedOptionId(option.id);
        // Em vez de navegar de volta, usamos o router para passar os dados para a rota anterior
        // O Expo Router não tem um sistema de "retorno com resultado" tão direto como o React Navigation clássico.
        // Uma abordagem é usar um estado global (Zustand, Context) ou passar parâmetros de volta
        // ao navegar para trás, mas o mais simples para Expo Router é usar router.back()
        // e o ecrã anterior (AddExpenseScreen) pode usar useFocusEffect para verificar se algo mudou
        // ou, melhor ainda, usar um state manager.
        // Por agora, vamos assumir que o AddExpenseScreen vai buscar esta seleção
        // de alguma forma (ex: através de um state manager ou esperando um parâmetro ao voltar).
        // Para este exemplo, vamos apenas navegar de volta. O AddExpenseScreen precisará de uma forma de
        // saber qual opção foi selecionada (ex: guardando no AsyncStorage ou num state manager).

        // Para simplificar, vamos assumir que o router pode passar parâmetros ao voltar,
        // ou que um state manager é usado. Para este exemplo, vamos apenas voltar.
        // Idealmente, o AddExpenseScreen usaria um listener ou um state manager.
        if (router.canGoBack()) {
            // Para passar o resultado de volta, o ideal seria um state manager (Zustand, Redux, Context API)
            // ou usar AsyncStorage e o ecrã anterior ler de lá no useFocusEffect.
            // Por agora, vamos apenas simular que o ecrã anterior saberá.
            // Para um exemplo mais concreto, poderíamos usar router.setParams na rota anterior,
            // mas isso é mais complexo com modais.
            // A forma mais simples é o ecrã anterior (AddExpenseScreen) ter um estado
            // que é atualizado por este ecrã através de um callback passado como parâmetro,
            // ou usando um state manager.

            // Para este exemplo, vamos assumir que o AddExpenseScreen vai buscar o resultado
            // de um state manager ou AsyncStorage após o router.back().
            // Exemplo com AsyncStorage (o AddExpenseScreen leria isto no useFocusEffect):
            AsyncStorage.setItem('selected_split_option', JSON.stringify(option)).then(() => {
                router.back();
            });
        }
    }; */

    const handleSelectOption = async (option: SplitTypeOption) => {
        setSelectedOptionId(option.id);
        console.log("[SelectSplitTypeScreen] Opção selecionada:", option);
        try {
            await AsyncStorage.setItem('selected_split_option', JSON.stringify(option));
            console.log("[SelectSplitTypeScreen] Opção guardada no AsyncStorage.");
            console.log("[SelectSplitTypeScreen] router.canGoBack().", router.canGoBack());

            if (router.canGoBack()) {
                console.log("[SelectSplitTypeScreen] A voltar para o ecrã anterior.");
                router.back();
            } else {
                console.warn("[SelectSplitTypeScreen] Não é possível voltar, a navegar para /add-expense como fallback.");
                router.replace('/(tabs)'); // Ou para a sua rota principal
            }
        } catch (e) {
            console.error("[SelectSplitTypeScreen] Erro ao guardar opção ou navegar:", e);
            Alert.alert("Erro", "Não foi possível guardar a sua seleção.");
        }
    };

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" /></View>;
    }

    const renderItem = ({ item }: { item: SplitTypeOption }) => {
        const description = item.description_template.replace('{friendIdName}', friendName);
        const isSelected = item.id === selectedOptionId;
        return (
            <TouchableOpacity
                style={[styles.optionButton, isSelected && styles.selectedOptionButton]}
                onPress={() => handleSelectOption(item)}
            >
                <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>{description}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.screenContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
{/*             <Stack.Screen options={{ title: 'Como foi pago?', presentation: 'modal' }} />
 */}            
            <Stack.Screen
                options={{
                title: 'Como foi pago?',
                presentation: 'modal', // Garante que é um modal
                gestureEnabled: true, // Garante que os gestos para fechar modais estão ativos
                headerLeft: () => ( // Adiciona um botão de fechar explícito para iOS se o gesto não for suficiente
                    Platform.OS === 'ios' ? (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                        <Ionicons name="close" size={28} color="#007AFF" />
                    </TouchableOpacity>
                    ) : null
                ),
                }}
            />
            <Text style={styles.title}>Como é que esta despesa foi paga?</Text>
            <FlatList
                data={options}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#F4F6F8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        paddingHorizontal: 16,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    optionButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    selectedOptionButton: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
        flexShrink: 1, // Para quebrar linha se necessário
    },
    selectedOptionText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
});
