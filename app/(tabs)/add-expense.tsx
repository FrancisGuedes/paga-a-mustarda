// app/add-expense.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Button,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SplitTypeOption } from '../select-split-type'; // Assume que este tipo está definido em app/select-split-type.tsx

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{friendId?: string; friendName?: string; currentOptionId?: string}>();
  const { auth } = useAuth();
  const insets = useSafeAreaInsets();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; avatarUrl?: string } | null>(null);
  const [selectedSplitOption, setSelectedSplitOption] = useState<SplitTypeOption | null>(null);
  const [displaySplitText, setDisplaySplitText] = useState('A carregar opção...');
  const [isSaving, setIsSaving] = useState(false);

  // Efeito para definir o amigo selecionado com base nos parâmetros da rota
  useEffect(() => {
    console.log("[AddExpenseScreen] Params da rota recebidos:", params);
    const { friendId, friendName } = params;
    if (friendId && friendName) {
      const newFriend = { id: friendId, name: friendName };
      // Só atualiza se o amigo realmente mudou para evitar re-renders
      if (selectedFriend?.id !== newFriend.id) {
        console.log("[AddExpenseScreen] Amigo definido/mudou para:", newFriend.name);
        setSelectedFriend(newFriend);
        setSelectedSplitOption(null); // Reseta a opção de divisão para o novo amigo
        setDisplaySplitText('A carregar opção...'); // Mostra texto de loading para a opção
      }
    } else if (!friendId && selectedFriend !== null) {
      // Se navegou para cá sem friendId (ex: adicionar despesa genérica), limpa o amigo selecionado
      console.log("[AddExpenseScreen] Nenhum amigo nos params, limpando selectedFriend.");
      setSelectedFriend(null);
      setSelectedSplitOption(null);
      setDisplaySplitText('Pago por si e dividido em partes iguais'); // Default genérico
    }
  }, [params, selectedFriend?.id]); // Adicionado selectedFriend?.id para reavaliar se ele for limpo

  // Função para carregar a opção de divisão (do AsyncStorage ou default do Supabase)
  const loadSplitOption = useCallback(async (currentFriendName: string | undefined) => {
    console.log("[loadSplitOption] A tentar carregar opção de divisão para o amigo:", currentFriendName || "genérico");
    try {
      const storedOptionJson = await AsyncStorage.getItem('selected_split_option');
      if (storedOptionJson) {
        const storedOption = JSON.parse(storedOptionJson) as SplitTypeOption;
        console.log("[loadSplitOption] Opção carregada do AsyncStorage:", storedOption.description_template);
        setSelectedSplitOption(storedOption);
        // AsyncStorage.removeItem('selected_split_option'); // Limpa após usar para não afetar a próxima despesa
        return; // Já temos uma opção do seletor
      }

      // Se não há nada no AsyncStorage, busca a default do Supabase
      console.log("[loadSplitOption] Nenhuma opção no cache, buscando default (sort_order = 1) do Supabase...");
      const { data, error } = await supabase
        .from('expense_split_options')
        .select('*')
        .eq('sort_order', 1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // Ignora erro se não encontrar (PGRST116)

      if (data) {
        console.log("[loadSplitOption] Opção default carregada do Supabase:", data.description_template);
        setSelectedSplitOption(data as SplitTypeOption);
      } else {
        console.log("[loadSplitOption] Nenhuma opção default (sort_order=1) encontrada no Supabase.");
        setSelectedSplitOption(null); // Garante que é null se não houver default
      }
    } catch (error) {
      console.error("Erro ao carregar opção de divisão em loadSplitOption:", error);
      setSelectedSplitOption(null); // Garante que é null em caso de erro
      Alert.alert("Erro", "Não foi possível carregar as opções de divisão.");
    }
  }, []); // Este useCallback não tem dependências diretas de estado que ele mesmo modifica

  // Efeito para carregar a opção de divisão quando o ecrã foca ou o amigo selecionado muda
  useFocusEffect(
    useCallback(() => {
      console.log("AddExpenseScreen focado. Amigo selecionado:", selectedFriend?.name);
      // Carrega a opção de divisão (do AsyncStorage ou default)
      // A lógica interna de loadSplitOption decidirá se busca do Supabase ou usa o cache.
      loadSplitOption(selectedFriend?.name);
    }, [selectedFriend, loadSplitOption])
  );

  // Efeito para atualizar o texto de exibição da opção de divisão
  useEffect(() => {
    if (selectedSplitOption) {
      setDisplaySplitText(selectedSplitOption.description_template.replace('{friendIdName}', selectedFriend?.name || 'amigo'));
    } else if (selectedFriend) {
      // Se não há selectedSplitOption (ex: foi resetado), mas temos um amigo,
      // o useFocusEffect já chamou loadSplitOption que buscará a default.
      // Podemos manter um texto de loading ou um default genérico aqui.
      setDisplaySplitText('Pago por si e dividido em partes iguais'.replace('{friendIdName}', selectedFriend.name || 'amigo'));
    } else {
      // Sem amigo e sem opção selecionada (ex: despesa genérica, opção default ainda não carregada)
      setDisplaySplitText('Pago por si e dividido em partes iguais');
    }
  }, [selectedSplitOption, selectedFriend?.name]);


  const handleSaveExpense = async () => {
    if (!auth.user?.id || !selectedFriend?.id || !description.trim() || !amount.trim() || !selectedSplitOption) {
      Alert.alert('Campos em falta', 'Preencha todos os campos obrigatórios e selecione como a despesa foi paga.');
      return;
    }
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Valor inválido', 'Insira um valor monetário válido para a despesa.');
      return;
    }
    setIsSaving(true);
    let userShare = 0;
    const splitDivisor = 2; // Assumindo divisão por 2 para 'EQUALLY'

    switch (selectedSplitOption.split_type) {
      case 'EQUALLY':
        userShare = selectedSplitOption.user_pays_total ? numericAmount / splitDivisor : -(numericAmount / splitDivisor);
        break;
      case 'FRIEND_OWES_USER_TOTAL': // Amigo deve o total ao utilizador
        userShare = numericAmount;
        break;
      case 'USER_OWES_FRIEND_TOTAL': // Utilizador deve o total ao amigo
        userShare = -numericAmount;
        break;
      default:
        Alert.alert("Erro", "Tipo de divisão inválido selecionado.");
        setIsSaving(false);
        return;
    }

    try {
      // 1. Inserir na tabela 'expenses'
      const newExpense = {
        user_id: auth.user.id,
        friend_id: selectedFriend.id,
        description: description.trim(),
        total_amount: numericAmount,
        user_share: userShare,
        date: new Date().toISOString(),
        paid_by_user: selectedSplitOption.user_pays_total,
        // category_icon: 'nome_do_icone' // Adicionar mais tarde
      };
      console.log("A guardar despesa:", newExpense);
      const { error: expenseError } = await supabase.from('expenses').insert([newExpense]).select().single().throwOnError();
      // throwOnError() já lança o erro se houver

      // 2. Atualizar o 'balance' na tabela 'friends'
      console.log("A buscar saldo atual do amigo:", selectedFriend.id);
      const { data: friendData, error: friendFetchError } = await supabase
        .from('friends')
        .select('balance')
        .eq('user_id', auth.user.id) // O registo de amizade pertence ao utilizador logado
        .eq('id', selectedFriend.id)   // E é para este amigo específico
        .single();

      if (friendFetchError && friendFetchError.code !== 'PGRST116') { // PGRST116: 0 rows
        throw friendFetchError;
      }

      const currentFriendBalance = friendData?.balance || 0;
      const newFriendBalance = currentFriendBalance + userShare;
      console.log(`Saldo atual: ${currentFriendBalance}, userShare: ${userShare}, Novo saldo: ${newFriendBalance}`);

      const { error: friendUpdateError } = await supabase
        .from('friends')
        .update({ balance: newFriendBalance, updated_at: new Date().toISOString() })
        .eq('user_id', auth.user.id)
        .eq('id', selectedFriend.id)
        .throwOnError();

      console.log("Saldo do amigo atualizado com sucesso.");
      Alert.alert('Sucesso', 'Despesa adicionada com sucesso!');
      await AsyncStorage.removeItem('selected_split_option'); // Limpa a opção do cache
      setSelectedSplitOption(null); // Reseta o estado local
      setDescription('');
      setAmount('');
      router.back();

    } catch (error: any) {
      console.error("Erro ao guardar despesa:", JSON.stringify(error, null, 2), error);
      Alert.alert('Erro', `Não foi possível guardar a despesa: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canSaveChanges = description.trim() !== '' && amount.trim() !== '' && parseFloat(amount.replace(',', '.')) > 0 && selectedSplitOption !== null;

  // Se não há amigo selecionado (ex: vindo do "+" genérico da tab bar)
  if (!selectedFriend) {
    // TODO: Implementar uma UI para selecionar um amigo aqui
    // Por agora, mostra uma mensagem e um botão para voltar.
    return (
        <View style={[styles.container, {paddingTop: insets.top}]}>
            <Stack.Screen options={{ title: 'Adicionar Despesa' }} />
            <Text style={styles.infoText}>Primeiro, precisa de selecionar um amigo.</Text>
            <Text style={styles.infoSubText}>(UI de seleção de amigo a ser implementada)</Text>
            <View style={{marginTop: 20}}>
                <Button title="Voltar para Amigos" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
            </View>
        </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Adicionar uma despesa',
          headerRight: () => (
            <TouchableOpacity onPress={handleSaveExpense} disabled={!canSaveChanges || isSaving}>
              <Text style={[styles.saveButton, (!canSaveChanges || isSaving) && styles.saveButtonDisabled]}>
                Guardar
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.friendSelector}>
          <Text style={styles.withUserText}>Com:</Text>
          {selectedFriend.avatarUrl && selectedFriend.avatarUrl !== 'placeholder' ? (
            <Image source={{uri: selectedFriend.avatarUrl}} style={styles.friendAvatar} />
          ) : (
            <View style={styles.friendAvatarPlaceholder} />
          )}
          <Text style={styles.friendName}>{selectedFriend.name}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="document-text-outline" size={24} color="#888" style={styles.inputIcon} />
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
            keyboardType="decimal-pad" // Melhor para valores monetários
            placeholderTextColor="#B0B0B0"
          />
        </View>

        <TouchableOpacity
          style={styles.splitTypeButton}
          onPress={() => router.push({
            pathname: '/select-split-type', 
            params: { friendName: selectedFriend.name, currentOptionId: selectedSplitOption?.id }
          })}
        >
          <Text style={styles.splitTypeButtonText}>{displaySplitText}</Text>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="calendar-outline" size={20} color="#555" style={styles.controlIcon} />
                <Text>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="people-outline" size={20} color="#555" style={styles.controlIcon} />
                <Text>Sem grupo</Text>
            </TouchableOpacity>
        </View>

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

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F4F6F8', },
  scrollContent: { padding: 20, flexGrow: 1 }, // Adicionado flexGrow para melhor comportamento do KeyboardAvoidingView
  saveButton: { color: '#007AFF', fontSize: 17, fontWeight: '500', marginRight: Platform.OS === 'ios' ? 0 : 10, },
  saveButtonDisabled: { color: '#B0B0B0', },
  friendSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#fff', borderRadius: 10, },
  withUserText: { fontSize: 16, color: '#555', marginRight: 8, },
  friendAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8, },
  friendAvatarPlaceholder: { width: 30, height: 30, borderRadius: 15, marginRight: 8, backgroundColor: '#E0E0E0', },
  friendName: { fontSize: 16, fontWeight: '500', color: '#333', },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0',  },
  inputIcon: { marginRight: 10, },
  inputDescription: { flex: 1, height: 55, fontSize: 17, color: '#333', },
  currencySymbol: { fontSize: 36,  color: '#888', marginRight: 8, },
  inputAmount: { flex: 1, height: 70,  fontSize: 36,  fontWeight: '300', color: '#333', },
  splitTypeButton: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 18, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
  splitTypeButtonText: { fontSize: 16, color: '#333', flexShrink: 1, marginRight: 5 },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 10, },
  controlButton: { flexDirection: 'row', alignItems: 'center', padding: 10, },
  controlIcon: { marginRight: 6, },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16, },
  container: {  flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  infoText: { fontSize: 18, textAlign: 'center', marginBottom: 10},
  infoSubText: { fontSize: 14, textAlign: 'center', color: 'gray'},
});
