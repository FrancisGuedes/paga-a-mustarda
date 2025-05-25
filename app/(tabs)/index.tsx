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
  Button,
  RefreshControl
} from 'react-native';
// import { useAuth } from '../../context/AuthContext'; // Descomente se precisar
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Friend {
  id: string;
  user_id?: string;
  name: string;
  avatarUrl?: string | null;
  balance: number;
  created_at?: string | null;
  updated_at?: string | null;
}

const FRIENDS_STORAGE_KEY_PREFIX = 'paga_a_mostarda_friends_cache_';

// --- Componentes Skeleton ---
const SkeletonPlaceholder = ({ width, height, style, circle = false }: { width: number | string; height: number; style?: object, circle?: boolean }) => (
  <View style={[{ width, height, backgroundColor: '#E0E0E0', borderRadius: circle ? height / 2 : 4 }, style]} />
);

const SkeletonFriendItem = () => (
  <View style={styles.friendItemContainer}>
    <SkeletonPlaceholder width={48} height={48} circle={true} style={styles.avatarSkeleton} />
    <View style={styles.friendInfo}>
      <SkeletonPlaceholder width={'70%'} height={18} style={{ marginBottom: 6 }} />
      {/* <SkeletonPlaceholder width={'40%'} height={14} /> // Opcional: para subtexto se houver */}
    </View>
    <View style={styles.friendBalance}>
      <SkeletonPlaceholder width={60} height={16} style={{ marginBottom: 4 }} />
      <SkeletonPlaceholder width={80} height={12} />
    </View>
  </View>
);
// --- Fim Componentes Skeleton ---

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
  // `initialLoading` para o primeiro carregamento do ecrã ou quando não há dados em cache.
  const [initialLoading, setInitialLoading] = useState(true);
  // `isRefreshing` para atualizações em segundo plano ou pull-to-refresh.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const insets = useSafeAreaInsets();

  const getFriendsStorageKey = useCallback(() => {
    if (!auth.user?.id) return null;
    return `${FRIENDS_STORAGE_KEY_PREFIX}${auth.user.id}`;
  }, [auth.user?.id]);

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

      //console.log(`[fetchFriends] Resposta Supabase - Status: ${status}, StatusText: ${statusText}, Erro:`, supabaseError, "Dados:", data);

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
  const loadFriends = useCallback(async (options: { forceNetwork?: boolean; isPullToRefresh?: boolean  } = {}) => {
    const { forceNetwork = false, isPullToRefresh = false } = options;
    const storageKey = getFriendsStorageKey();
    //console.log("[loadFriends] storageKey: ", storageKey);

    if (!auth.user?.id) {
      //console.log("[loadFriends] Nenhum utilizador autenticado.");
      setFriends([]);
      setInitialLoading(false);
      setIsRefreshing(false);
      return;
    }
    const currentUserId = auth.user.id;

    //console.log("[loadFriends] A iniciar. Forçar rede:", forceNetwork);    
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else if (friends.length === 0 || forceNetwork) {
      // Show main loading only if there are no friends or if forceNetwork is true (not a pull-to-refresh)
      setInitialLoading(true);
    }
    // If we already have friends and it's not a pull-to-refresh, use a more subtle background loading
    
    setError(null);

    // 1. Try loading from AsyncStorage first, unless forceNetwork is true
    if (!forceNetwork && !isPullToRefresh && storageKey) {
      try {
        const cachedFriendsJson = await AsyncStorage.getItem(storageKey);
        if (cachedFriendsJson) {
          const cachedFriends = JSON.parse(cachedFriendsJson) as Friend[];
          //console.log("[loadFriends] Amigos carregados do cache:", cachedFriends.length);
          setFriends(cachedFriends);
          setInitialLoading(false);
        }
      } catch (e) {
        console.error("[loadFriends] Erro ao ler amigos do cache:", e);
      }
    } else if (forceNetwork && !isPullToRefresh) {
        // Se forçar a rede, podemos limpar o estado local para mostrar o loading
        setFriends([]);
    }

    // 2. Fetch from Supabase to update
    try {
      const data = await fetchFriends(currentUserId);
      //console.log("[loadFriends] Dados dos amigos obtidos do Supabase:", data.length);
      
      setFriends(data);

      if (storageKey) {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(data));
          //console.log("[loadFriends] Amigos guardados no cache.");
        } catch (e) {
          console.error("[loadFriends] Erro ao guardar amigos no cache:", e);
        }
      }
      if (data.length === 0) {
        //console.log("[loadFriends] Nenhum amigo encontrado para este utilizador no Supabase.");
      }

    } catch (e: any) {
      console.error("[loadFriends] Erro final ao carregar amigos do Supabase:", JSON.stringify(e, null, 2), e);
      const errorMessage = e.message || 'Falha ao carregar amigos.';
      setError(errorMessage);
      // Se falhar e não tivermos nada do cache, mostramos o erro.
      // Se já tivermos dados do cache, podemos optar por não mostrar um erro tão proeminente.
      if (friends.length === 0 || isPullToRefresh) { // Só mostra erro se não tiver dados do cache
        Alert.alert("Erro ao Carregar Amigos", errorMessage);
      } else {
        console.warn("Falha ao atualizar amigos do Supabase, a usar dados do cache:", errorMessage);
        // Poderia mostrar um toast discreto aqui
      }
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      //console.log("[loadFriends] Finalizado.");
    }
  }, [auth.user, auth.isLoading, getFriendsStorageKey, friends.length]); // Adicionado getFriendsStorageKey

  // Load friends when the screen gains focus or when the user/auth.isLoading changes
  useFocusEffect(
    useCallback(() => {
      if (auth.user && !auth.isLoading) {
        console.log("Ecrã de Amigos focado e utilizador autenticado, a carregar amigos...");
        // Don’t force a network fetch on focus by default, unless there are no friends in state
        loadFriends({ forceNetwork: friends.length === 0 });
      } else if (!auth.isLoading && !auth.user) {
        console.log("Ecrã de Amigos focado, mas sem utilizador autenticado.");
        setFriends([]);
        const storageKey = getFriendsStorageKey();
        if (storageKey) AsyncStorage.removeItem(storageKey);
        setInitialLoading(false);
      }
    }, [auth.user, auth.isLoading, loadFriends, getFriendsStorageKey, friends.length])
  );

  const onRefresh = useCallback(() => {
    console.log("Pull to refresh acionado");
    if (auth.user && !auth.isLoading) {
      loadFriends({ forceNetwork: true, isPullToRefresh: true });
    }
  }, [auth.user, auth.isLoading, loadFriends]);

  const netBalance = friends.reduce((acc, friend) => acc + (friend.balance || 0), 0);
  const netBalanceText = netBalance > 0 ? `No total, devem-lhe ${netBalance.toFixed(2)} €` :
                        netBalance < 0 ? `No total, deve ${Math.abs(netBalance).toFixed(2)} €` :
                        'No total, as contas estão acertadas.';

  const friendsWithPendingBalance = friends.filter(f => f.balance !== 0);
  const settledFriendsCount = friends.filter(f => f.balance === 0).length;

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
        onPress={() => router.push({ pathname: `/friend/[friendId]`, 
          params: { friendId: item.id, name: item.name } 
        })}
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

  // Initial loading screen while AuthContext checks the session
  if (auth.isLoading) {
    return (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>Aguardando autenticação...</Text>
        </View>
    );
  }

  // If there's no user after the AuthContext has finished loading
  if (!auth.user) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Precisa de estar logado para ver os amigos.</Text>
        {/* O redirecionamento para login deve ser tratado pelo app/_layout.tsx */}
      </View>
    );
  }

  // If there's a user but friends are still loading
  /* if (initialLoading && friends.length === 0) {
    return (
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text>A carregar amigos...</Text>
        </View>
    );
  } */
 if (initialLoading && friends.length === 0 && !isRefreshing) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: styles.screenContainer.backgroundColor }}>
        {/* Cabeçalho Personalizado (visível durante o skeleton) */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon}><Ionicons name="search-outline" size={26} color="#333" /></TouchableOpacity>
          <Link href="/add-friend" style={styles.addFriendsLinkStyle}><Text style={styles.addFriendsButtonText}>Adicionar amigos</Text></Link>
        </View>
        {/* Resumo do Saldo (visível durante o skeleton, com placeholder para o texto) */}
        <View style={styles.summaryContainer}>
          <SkeletonPlaceholder width={'70%'} height={20} />
          <TouchableOpacity style={styles.filterIcon}><MaterialCommunityIcons name="filter-variant" size={24} color="#555" /></TouchableOpacity>
        </View>
        {/* Lista de Skeleton Items */}
        <ScrollView style={styles.scrollViewStyle} contentContainerStyle={styles.scrollContentContainer}>
            <SkeletonFriendItem />
            <SkeletonFriendItem />
            <SkeletonFriendItem />
            <SkeletonFriendItem />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: styles.screenContainer.backgroundColor }}>
      <ScrollView
        style={styles.scrollViewStyle}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>
        }
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

        {/* Background loading indicator (shown if `isRefreshing` is true but `initialLoading` is false) */}
        {isRefreshing && !initialLoading && (
            <View style={styles.backgroundLoadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.backgroundLoadingText}>A atualizar...</Text>
            </View>
        )}

        <FlatList
          data={friendsWithPendingBalance}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>
                {error ? `Erro: ${error}` : 'Nenhum amigo com saldo pendente.'}
              </Text>
              {error && <Button title="Tentar Novamente" onPress={() => loadFriends({ forceNetwork: true, isPullToRefresh: true  })} />}
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
  },
  backgroundLoadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backgroundLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
  avatarSkeleton: { // Estilo específico para o avatar no skeleton
    marginRight: 16,
  },
});
