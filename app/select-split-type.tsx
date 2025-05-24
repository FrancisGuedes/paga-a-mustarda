// app/select-split-type.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
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

const SPLIT_OPTIONS_CACHE_KEY = 'paga_a_mostarda_split_options_cache';

const areOptionsArraysEqual = (arr1: SplitTypeOption[], arr2: SplitTypeOption[]): boolean => {
    if (arr1.length !== arr2.length) return false;
    // Esta comparação com stringify assume que a ordem dos itens e das chaves dentro dos objetos é consistente.
    // Para uma comparação mais robusta, seria necessário iterar e comparar objeto por objeto.
    return JSON.stringify(arr1) === JSON.stringify(arr2);
};

export default function SelectSplitTypeScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ friendName?: string; currentOptionId?: string }>();
    const friendName = params.friendName || 'o amigo';
    const currentOptionId = params.currentOptionId;

    const [options, setOptions] = useState<SplitTypeOption[]>([]);
    // `pageLoading` para o ecrã de loading principal (quando não há dados em cache)
    const [pageLoading, setPageLoading] = useState(false);
    // `isRefreshing` para indicar uma atualização em segundo plano
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(currentOptionId);
    const insets = useSafeAreaInsets();

    const fetchAndCacheSplitOptions = useCallback(async (optionsFromCache?: SplitTypeOption[]) => {
        console.log("[SelectSplitTypeScreen] A buscar opções de divisão do Supabase...");
        // Indica que uma atualização de rede está em progresso

        try {
            const { data, error } = await supabase
                .from('expense_split_options')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;

            const fetchedOptions = data || [];
            
            if (!areOptionsArraysEqual(options, fetchedOptions)) {
                setPageLoading(false);
                setIsRefreshing(true); 
                console.log("[SelectSplitTypeScreen] fetchAndCacheSplitOptions: Dados da rede são diferentes do estado atual. A atualizar.");
                setOptions(fetchedOptions);
                await AsyncStorage.setItem(SPLIT_OPTIONS_CACHE_KEY, JSON.stringify(fetchedOptions));
                console.log("[SelectSplitTypeScreen] fetchAndCacheSplitOptions: Opções guardadas/atualizadas no cache.");
            } else {
                console.log("[SelectSplitTypeScreen] fetchAndCacheSplitOptions: Dados da rede são iguais aos do estado/cache. Nenhuma atualização de estado necessária.");
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível carregar as opções de divisão da rede.');
            console.error("Erro ao buscar opções de divisão do Supabase:", error);
            if (!optionsFromCache || optionsFromCache.length === 0) {
                // Se falhar e não tínhamos cache, limpamos as opções
                setOptions([]);
            }
        // Se já tínhamos opções do cache, podemos optar por mantê-las
        } finally {
            setIsRefreshing(false); // Termina o estado de refresh
            setPageLoading(false);
        }
    }, []);

    const loadOptionsOnMountOrFocus = useCallback(async () => {
        console.log("[SelectSplitTypeScreen] loadOptionsOnMountOrFocus - A carregar opções...");
        let cachePopulated = false;
        let cachedOptions: SplitTypeOption[] | null = null;
        try {
            const cachedOptionsJson = await AsyncStorage.getItem(SPLIT_OPTIONS_CACHE_KEY);
            if (cachedOptionsJson) {
                cachedOptions = JSON.parse(cachedOptionsJson) as SplitTypeOption[];
                console.log("[SelectSplitTypeScreen] Opções carregadas do cache:", cachedOptions.length);
                setOptions(cachedOptions);
                setPageLoading(false); // Cache encontrado e tem dados, para o loading principal
                cachePopulated = true;
            }
        } catch (e) {
            console.error("[SelectSplitTypeScreen] Erro ao ler opções do cache:", e);
        } finally {
            // Se não houver cache, pageLoading permanece true até fetchAndCacheSplitOptions terminar.
            // Se houver cache, pageLoading torna-se false aqui.
            if (cachedOptions && cachedOptions.length > 0) {
                setPageLoading(false);
            }
        }
        
        if (!cachePopulated) {
            setPageLoading(true);
        }
        // Sempre tenta buscar da rede para atualizar, mesmo que o cache exista.
        // fetchAndCacheSplitOptions irá definir pageLoading como false no seu finally.
        fetchAndCacheSplitOptions();
    }, [fetchAndCacheSplitOptions]);

    useFocusEffect(
        useCallback(() => {
            loadOptionsOnMountOrFocus();
        }, [loadOptionsOnMountOrFocus])
    );

    const handleSelectOption = async (option: SplitTypeOption) => {
        setSelectedOptionId(option.id);
        console.log("[SelectSplitTypeScreen] Opção selecionada:", option);
        try {
            await AsyncStorage.setItem('selected_split_option', JSON.stringify(option)); // Para o AddExpenseScreen ler
            console.log("[SelectSplitTypeScreen] Opção selecionada guardada no AsyncStorage ('selected_split_option').");
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)'); 
        }
        } catch (e) {
            console.error("[SelectSplitTypeScreen] Erro ao guardar opção selecionada ou navegar:", e);
            Alert.alert("Erro", "Não foi possível guardar a sua seleção.");
        }
    };

    if (pageLoading && options.length === 0) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007AFF" /></View>;
    }

    useEffect(() => {
        navigation.setOptions({
            presentation: 'modal',
            headerShown: true, // Garante que o header é mostrado
            title: 'Como foi pago?',
            gestureEnabled: true, 
            headerLeft: () => ( 
                Platform.OS === 'ios' ? (
                <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                    <Ionicons name="close" size={28} color="#007AFF" />
                </TouchableOpacity>
                ) : null
            )// Estilo para a barra do header
        });
    }, [navigation, router]);

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
            <Text style={styles.title}>Como é que esta despesa foi paga?</Text>
            {isRefreshing && options.length > 0 && ( 
                <View style={styles.inlineLoadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.inlineLoadingText}>A atualizar opções...</Text>
                </View>
            )}
            <FlatList
                data={options}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={!pageLoading && !isRefreshing ? <Text style={styles.emptyText}>Nenhuma opção de divisão encontrada.</Text> : null}
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
        emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: 'gray',
    },
        inlineLoadingContainer: { 
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
        inlineLoadingText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#555',
    },
});
