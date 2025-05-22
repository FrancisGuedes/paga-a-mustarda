// app/(tabs)/index.tsx
import 'react-native-url-polyfill/auto';
//import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Button
} from 'react-native';
// import { useAuth } from '../../context/AuthContext'; // Descomente se precisar
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';

interface Friend {
  id: string;
  user_id?: string;
  name: string;
  avatarUrl?: string | null;
  balance: number;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Friends list screen with pending balances.
 * Displays a summary at the top with the total balance and allows adding new friends.
 * The friends list is rendered using a FlatList, with a button for each item.
 * Each button navigates to the friend's detail screen.
 * The screen also includes options to filter the friends.
 * 
 * @returns JSX.Element
 */
export default function FriendsScreen() {
  const router = useRouter();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const insets = useSafeAreaInsets();

  /**
   * Function to fetch a user's friends from Supabase.
   * 
   * @param userId The ID of the user whose friends should be retrieved.
   * @returns An array of objects containing the friends' information.
   */
  const fetchFriends = async (userId: string) => {
    console.log(`[fetchFriends] A buscar amigos para o user ID: ${userId}`);
    try {
      const { data, error: supabaseError, status, statusText } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', userId);

      console.log(`[fetchFriends] Resposta Supabase - Status: ${status}, StatusText: ${statusText}, Erro:`, supabaseError, "Dados:", data);

      if (supabaseError) {
        console.error("Erro de Supabase ao buscar amigos (simples):", supabaseError);
        throw supabaseError; 
      }
      return data || []; 
    } catch (e: any) {
      console.error("[fetchFriends] Exceção ao buscar amigos:", e);
      throw e; 
    }
  };

  /**
   * Function to load user's friends.
   * 
   * @returns void
   */
  const loadFriends = useCallback(async () => {
    console.log("[loadFriends] A iniciar. Auth state:", auth);
    if (!auth.user?.id) {
      setLoading(false);
      setFriends([]);
      setError(auth.isLoading ? null : "Utilizador não autenticado."); // Mostra erro se não estiver a carregar e não houver utilizador
      console.log("[loadFriends] Nenhum utilizador autenticado (mock) ou ID em falta, não a buscar amigos.");
      return;
    }
    const currentUserId = auth.user.id;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFriends(currentUserId);
      console.log("[loadFriends] Dados dos amigos obtidos:", data);
      if (data && data.length === 0) {
        console.log("[loadFriends] Nenhum amigo encontrado para este utilizador no Supabase, mas a query foi bem-sucedida.");
      }
      setFriends(data as Friend[]);
    } catch (e: any) {
      console.error("[loadFriends] Erro final ao carregar amigos:", JSON.stringify(e, null, 2), e); // Log detalhado do erro
      const errorMessage = e.message || 'Falha ao carregar amigos. Verifique a sua ligação ou tente mais tarde.';
      setError(errorMessage);
      Alert.alert("Erro ao Carregar Amigos", errorMessage);
      setFriends([]);
    } finally {
      setLoading(false);
      console.log("[loadFriends] Finalizado.");
    }
  }, [auth.user, auth.isLoading]);

  useFocusEffect(
    useCallback(() => {
      if (auth.user && !auth.isLoading) {
        console.log("Ecrã de Amigos focado e utilizador autenticado, a carregar amigos...");
        loadFriends();
      } else if (!auth.isLoading && !auth.user) {
        console.log("Ecrã de Amigos focado, mas sem utilizador autenticado.");
        setFriends([]); // Limpa amigos se não houver utilizador
        setLoading(false);
      }
    }, [auth.user, auth.isLoading, loadFriends])
  );

  const netBalance = !loading && friends.length > 0 ? friends.reduce((acc, friend) => acc + (friend.balance || 0), 0) : 0;
  const netBalanceText = !loading && friends.length > 0 ?
                          (netBalance > 0 ? `No total, devem-lhe ${netBalance.toFixed(2)} €` :
                          netBalance < 0 ? `No total, deve ${Math.abs(netBalance).toFixed(2)} €` :
                          'No total, as contas estão acertadas.') :
                          (auth.user && !loading && !error ? 'Sem saldos a apresentar.' : (auth.user && !loading && error ? '' : 'A carregar saldo...'));


  const friendsWithPendingBalance = !loading ? friends.filter(f => f.balance !== 0) : [];
  const settledFriendsCount = !loading ? friends.filter(f => f.balance === 0).length : 0;

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const iOweFriend = item.balance < 0;
    const friendOwesMe = item.balance > 0;
    const absoluteBalance = Math.abs(item.balance).toFixed(2);

    let balanceDescription = 'contas acertadas';
    let balanceColorStyle = styles.settledColor;

    if (friendOwesMe) {
      balanceDescription = `deve-lhe ${absoluteBalance} €`;
      balanceColorStyle = styles.friendOwesMeColor;
    } else if (iOweFriend) {
      balanceDescription = `deve ${absoluteBalance} €`;
      balanceColorStyle = styles.iOweFriendColor;
    }

    return (
      <TouchableOpacity
        style={styles.friendItemContainer}
        onPress={() => router.push({ pathname: `/friend/[friendId]`, params: { friendId: item.id, name: item.name } })}
      >
        {/* TODO: o pathname para o amigo tem de ser mudado para pathname: `/friend/${item.id}` */}
        {item.avatarUrl && item.avatarUrl !== 'placeholder' ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar} />
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.name}</Text>
        </View>
        <View style={styles.friendBalance}>
          <Text style={[styles.balanceText, balanceColorStyle]}>{balanceDescription}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Ecrã de Loading inicial enquanto o AuthContext verifica a sessão
  if (loading && !auth.user) {
    return (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Aguardando autenticação...</Text>
        </View>
    );
  }

  // Se não houver utilizador após o carregamento do AuthContext
  if (!auth.user) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Precisa de estar logado para ver os amigos.</Text>
        {/* O redirecionamento para login deve ser tratado pelo app/_layout.tsx */}
      </View>
    );
  }

  // Se houver utilizador, mas os amigos ainda estão a carregar
  if (loading) {
    return (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>A carregar amigos...</Text>
        </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: styles.screenContainer.backgroundColor }}>
      <ScrollView
        style={styles.scrollViewStyle}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="search-outline" size={26} color="#333" />
          </TouchableOpacity>
          <Link href="/add-friend" asChild>
            <TouchableOpacity>
              <Text style={styles.addFriendsButtonText}>Adicionar amigos</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>{netBalanceText}</Text>
          <TouchableOpacity style={styles.filterIcon}>
              <MaterialCommunityIcons name="filter-variant" size={24} color="#555" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={friendsWithPendingBalance}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>
                {error ? `Erro: ${error}` : 'Nenhum amigo com saldo pendente.'}
              </Text>
              {error && <Button title="Tentar Novamente" onPress={loadFriends} />}
            </View>
          }
          scrollEnabled={false}
        />

        <View style={styles.settledOptionsOuterContainer}>
          <View style={styles.settledOptionsInnerContainer}>
            <Text style={styles.settledInfoText}>
              Ocultar amigos com quem tem as contas acertadas há mais de 7 dias
            </Text>
            {settledFriendsCount > 0 && (
              <TouchableOpacity style={styles.showSettledButton}>
                <Text style={styles.showSettledButtonText}>
                  Mostrar {settledFriendsCount} amigo(s) com contas liquidadas
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    backgroundColor: '#FFFFFF',
  },
  scrollViewStyle: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    padding: 8,
  },
  addFriendsLinkStyle: {
    padding: 8,
  },
  addFriendsButtonText: {
    fontSize: 17, 
    color: '#007AFF',
    fontWeight: '500',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20, 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1C1E',
    flexShrink: 1,
  },
  filterIcon: {
    padding: 8,
  },
  friendItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 16, 
    backgroundColor: '#E9E9EF',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 17, 
    fontWeight: "500",
    color: '#1C1C1E',
  },
  friendBalance: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontSize: 16, 
    fontWeight: '400',
  },
  friendOwesMeColor: {
    color: '#34C759',
  },
  iOweFriendColor: {
    color: '#FF3B30',
  },
  settledColor: {
    color: '#8E8E93',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
    fontSize: 16,
    color: '#8E8E93',
    paddingHorizontal: 20,
  },
  settledOptionsOuterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  settledOptionsInnerContainer: {
    // Estilos se necessário
  },
  settledInfoText: {
    fontSize: 13,
    color: '#6D6D72',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 18,
  },
  showSettledButton: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  showSettledButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  listLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  listLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyListContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  }
});
