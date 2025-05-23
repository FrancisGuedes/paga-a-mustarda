// app/add-expense.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase'; // Ajuste o caminho
import { useAuth } from '../../context/AuthContext'; // Ajuste o caminho
import type { SplitTypeOption } from '../select-split-type'; // Importa o tipo

interface AddExpenseScreenParams {
  friendId?: string;
  friendName?: string;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{friendId?: string; friendName?: string; currentOptionId?: string}>();
  const { auth } = useAuth();
  const insets = useSafeAreaInsets();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<{ 
    id: string; 
    name: string; 
    avatarUrl?: string 
  } | null>(
    params.friendId && params.friendName ? { 
      id: params.friendId, 
      name: params.friendName
    } : null
  );
  const [selectedSplitOption, setSelectedSplitOption] = useState<SplitTypeOption | null>(null);
  const [defaultSplitOptionText, setDefaultSplitOptionText] = useState('Pago por si e dividido em partes iguais');
  const [isSaving, setIsSaving] = useState(false);
  const [displaySplitText, setDisplaySplitText] = useState('A carregar opção...'); // Para o texto do botão

  console.log("[AddExpenseScreen] params:", params);

  useEffect(() => {
    console.log("[AddExpenseScreen] Params recebidos:", params);
    let routeFriendId = params.friendId;
    let routeFriendName = params.friendName;
    if (routeFriendId && routeFriendName) {
      const newSelectedFriend = { id: routeFriendId, name: routeFriendName };
      // Só atualiza se o amigo realmente mudou para evitar re-renders desnecessários
      if (selectedFriend?.id !== newSelectedFriend.id) {
        console.log("[AddExpenseScreen] Amigo mudou para:", newSelectedFriend.name);
        setSelectedFriend(newSelectedFriend);
        setSelectedSplitOption(null); // Reseta a opção para forçar o carregamento da default para o novo amigo
      } else if (!selectedFriend) { // Se selectedFriend era null e agora temos params
        setSelectedFriend(newSelectedFriend);
      }
    } else if (!routeFriendId && selectedFriend) { // Se os params do amigo foram removidos (ex: navegação para despesa genérica)
        setSelectedFriend(null);
        setSelectedSplitOption(null);
    }
  }, [params.friendId, params.friendName]);

  // Carregar a opção de divisão selecionada (se houver) ou a default
  const loadSplitOption = useCallback(async () => {
    /* if (selectedSplitOption) {
      console.log("[loadSplitOption] Usando selectedSplitOption do estado:", selectedSplitOption.description_template);
      setDisplaySplitText(selectedSplitOption.description_template.replace('{friendIdName}', selectedFriend?.name || 'amigo'));
      return;
    } */

    try {
      const storedOptionJson = await AsyncStorage.getItem('selected_split_option');
      if (storedOptionJson) {
        const storedOption = JSON.parse(storedOptionJson) as SplitTypeOption;
        setSelectedSplitOption(storedOption);
        // Não limpar o AsyncStorage aqui, para que o valor persista se o utilizador voltar
        //setDisplaySplitText(storedOption.description_template.replace('{friendIdName}', selectedFriend?.name || 'amigo'));
        // Importante: Limpar do AsyncStorage depois de usar para que não afete a próxima despesa
        // a menos que o utilizador selecione novamente. Fazemos isto ao guardar.
        return;
      } else if (!selectedSplitOption) { // Se não há opção selecionada nem no cache, busca a default
        const { data, error } = await supabase
          .from('expense_split_options')
          .select('*')
          .eq('sort_order', 1)
          .single();

          console.log("Opção de divisão padrão carregada:", data);

        if (error) throw error;
        if (data) {
            setSelectedSplitOption(data as SplitTypeOption);
            setDefaultSplitOptionText(data.description_template.replace('{friendIdName}', selectedFriend?.name || 'amigo'));
        } else {
          console.log("[loadSplitOption] Nenhuma opção default (sort_order=1) encontrada, usando texto hardcoded.");
          //setDisplaySplitText('Pago por si e dividido em partes iguais'.replace('{friendName}', selectedFriend?.name || 'amigo'));
          setSelectedSplitOption(null); // Garante que não há opção selecionada se a default não for encontrada
        }
      }
    } catch (error) {
      console.error("Erro ao carregar opção de divisão:", error);
      // Mantém o texto default se falhar
    }
  }, [selectedFriend?.name]);

  useFocusEffect(
    useCallback(() => {
      console.log("AddExpenseScreen focado, a carregar opção de divisão...");
      loadSplitOption();
      // Limpa a opção selecionada do AsyncStorage depois de a usar,
      // para que não persista para a próxima despesa se não for explicitamente selecionada.
      // No entanto, pode ser melhor limpar apenas ao guardar com sucesso.
      // AsyncStorage.removeItem('selected_split_option'); 
    }, [loadSplitOption])
  );
  
  useEffect(() => {
    // Se os parâmetros do amigo mudarem (ex: ao selecionar um amigo de uma lista)
    if (params.friendId && params.friendName) {
      setSelectedFriend({ id: params.friendId, name: params.friendName });
    }
  }, [params.friendId, params.friendName]);


  const handleSaveExpense = async () => {
    if (!auth.user?.id || !selectedFriend?.id || !description || !amount || !selectedSplitOption) {
      Alert.alert('Campos em falta', 'Preencha todos os campos e selecione como a despesa foi paga.');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Valor inválido', 'Insira um valor válido para a despesa.');
      return;
    }

    setIsSaving(true);

    // Calcular user_share com base na opção de divisão
    let userShare = 0;
    const splitDivisor = 2; // Assumindo divisão por 2 para "EQUALLY"

    switch (selectedSplitOption.split_type) {
      case 'EQUALLY':
        userShare = selectedSplitOption.user_pays_total ? numericAmount / splitDivisor : - (numericAmount / splitDivisor);
        break;
      case 'FRIEND_OWES_USER_TOTAL': // Devem-lhe o valor total
        userShare = numericAmount;
        break;
      case 'USER_OWES_FRIEND_TOTAL': // É devido o valor total a {friendName}
        userShare = -numericAmount;
        break;
    }

    try {
      // 1. Inserir na tabela 'expenses'
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          user_id: auth.user.id,
          friend_id: selectedFriend.id,
          description: description,
          total_amount: numericAmount,
          user_share: userShare, // O valor que afeta o saldo do utilizador logado
          date: new Date().toISOString(), // Data atual
          paid_by_user: selectedSplitOption.user_pays_total,
          // category_icon: 'nome_do_icone' // Adicionar seleção de categoria mais tarde
        }])
        .select()
        .single();

      if (expenseError) throw expenseError;
      console.log("Despesa guardada:", expenseData);

      // 2. Atualizar o 'balance' na tabela 'friends'
      // Primeiro, buscar o saldo atual do amigo
      const { data: friendData, error: friendFetchError } = await supabase
        .from('friends')
        .select('balance')
        .eq('user_id', auth.user.id)
        .eq('id', selectedFriend.id) // Assumindo que 'id' na tabela friends é o ID do amigo
        .single();

      if (friendFetchError) throw friendFetchError;

      const currentFriendBalance = friendData?.balance || 0;
      const newFriendBalance = currentFriendBalance + userShare;

      const { error: friendUpdateError } = await supabase
        .from('friends')
        .update({ balance: newFriendBalance })
        .eq('user_id', auth.user.id)
        .eq('id', selectedFriend.id);

      if (friendUpdateError) throw friendUpdateError;
      console.log("Saldo do amigo atualizado para:", newFriendBalance);

      Alert.alert('Sucesso', 'Despesa adicionada com sucesso!');
      await AsyncStorage.removeItem('selected_split_option'); // Limpa a opção selecionada
      router.back(); // Volta para o ecrã anterior

    } catch (error: any) {
      console.error("Erro ao guardar despesa:", error);
      Alert.alert('Erro', `Não foi possível guardar a despesa: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canSaveChanges = description.trim() !== '' && amount.trim() !== '' && parseFloat(amount.replace(',', '.')) > 0 && selectedSplitOption !== null;

  const displaySplitOptionText = selectedSplitOption
    ? selectedSplitOption.description_template.replace('{friendIdName}', selectedFriend?.name || 'amigo')
    : defaultSplitOptionText;

  if (!selectedFriend) {
    return (
        <View style={[styles.container, {paddingTop: insets.top}]}>
            <Stack.Screen options={{ title: 'Adicionar' }} />
            <Text>Nenhum amigo selecionado. Volte e selecione um amigo.</Text>
            <Button title="Voltar" onPress={() => router.back()} />
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.friendSelector}>
          <Text style={styles.withUserText}>Com o utilizador e:</Text>
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
            placeholderTextColor="#aaa"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.inputAmount}
            placeholder="0,00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />
        </View>

        <TouchableOpacity
          style={styles.splitTypeButton}
          onPress={() => router.push({
            pathname: '/select-split-type',
            params: { friendName: selectedFriend.name, currentOptionId: selectedSplitOption?.id }
          })}
        >
          <Text style={styles.splitTypeButtonText}>{displaySplitOptionText}</Text>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </TouchableOpacity>

        {/* Outros campos como data, grupo, etc. podem ser adicionados aqui */}
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
  screenContainer: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContent: {
    padding: 20,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '500',
    marginRight: Platform.OS === 'ios' ? 0 : 10,
  },
  saveButtonDisabled: {
    color: '#B0B0B0',
  },
  friendSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  withUserText: {
    fontSize: 16,
    color: '#555',
    marginRight: 8,
  },
  friendAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  friendAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Apenas borda inferior
  },
  inputIcon: {
    marginRight: 10,
  },
  inputDescription: {
    flex: 1,
    height: 55,
    fontSize: 17,
    color: '#333',
  },
  currencySymbol: {
    fontSize: 36, // Tamanho grande para o símbolo da moeda
    color: '#888',
    marginRight: 8,
  },
  inputAmount: {
    flex: 1,
    height: 70, // Mais alto para o valor
    fontSize: 36, // Tamanho grande
    fontWeight: '300',
    color: '#333',
  },
  splitTypeButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  splitTypeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  controlIcon: {
    marginRight: 6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  container: { // Para o ecrã de "Nenhum amigo selecionado"
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  }
});