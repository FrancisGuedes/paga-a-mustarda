// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert
} from 'react-native';
// import { useAuth } from '../../context/AuthContext'; // Descomente se precisar
import { useRouter, Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  balance: number;
}

const MOCK_FRIENDS_DATA: Friend[] = [
  { id: '1', name: 'Rita Martins', balance: 7.25, avatarUrl: '../../assets/images/adaptive-icon.png' },
  { id: '2', name: 'João Silva', balance: -15.50, avatarUrl: '../../assets/images/adaptive-icon.png' },
  { id: '3', name: 'Ana Costa', balance: 0, avatarUrl: '../../assets/images/adaptive-icon.png' },
  { id: '4', name: 'Carlos Dias', balance: 5.00, avatarUrl: '../../assets/images/adaptive-icon.png' },
];

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS_DATA);
  const insets = useSafeAreaInsets();

  const netBalance = friends.reduce((acc, friend) => {
    if (friend.id === '1' || friend.id === '2' || friend.id === '4') {
        return acc + friend.balance;
    }
    return acc;
  }, 0);

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
        onPress={() => router.push({ pathname: "/friend/[friendId]", params: { friendId: item.id, name: item.name } })}
      >
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

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: styles.screenContainer.backgroundColor }}>
      <ScrollView
        style={styles.scrollViewStyle}
        contentContainerStyle={styles.scrollContentContainer}
        // stickyHeaderIndices={[1]} // Descomente se quiser o sumário fixo
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
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>Nenhum amigo com saldo pendente.</Text>}
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
    paddingBottom: 10, // Ajustado o padding do header
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    padding: 8,
  },
  addFriendsLinkStyle: { // Estilo para o próprio Link se necessário (ex: para padding)
    padding: 8,
  },
  addFriendsButtonText: {
    fontSize: 17, // Ajustado para corresponder à imagem
    color: '#007AFF',
    fontWeight: '500',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20, // Ajustado para corresponder à imagem
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
    width: 48, // Ajustado para corresponder à imagem
    height: 48, // Ajustado para corresponder à imagem
    borderRadius: 24, // Ajustado para corresponder à imagem
    marginRight: 16, // Ajustado para corresponder à imagem
    backgroundColor: '#E9E9EF',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 17, // Ajustado para corresponder à imagem
    fontWeight: "500",
    color: '#1C1C1E',
  },
  friendBalance: {
    alignItems: 'flex-end',
    //marginLeft: 8,
  },
  balanceText: {
    fontSize: 16, // Ajustado para corresponder à imagem
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
});
