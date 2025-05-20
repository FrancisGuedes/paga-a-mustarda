// app/(tabs)/friend/[friendId].tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Dados Mock para despesas com um amigo
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  iPaid?: boolean; // True se eu paguei, false se o amigo pagou
}

const MOCK_EXPENSES_DATA: { [friendId: string]: Expense[] } = {
  '1': [ // Despesas com Rita Martins (ID '1')
    { id: 'exp1', description: 'Jantar Tailandês', amount: 30.00, date: '2024-05-15', iPaid: true },
    { id: 'exp2', description: 'Bilhetes Cinema', amount: 14.50, date: '2024-05-10', iPaid: false },
    { id: 'exp3', description: 'Café', amount: 2.50, date: '2024-05-01', iPaid: true },
  ],
  '2': [ // Despesas com João Silva (ID '2')
    { id: 'exp4', description: 'Gasolina Viagem', amount: 20.00, date: '2024-05-12', iPaid: false },
    { id: 'exp5', description: 'Almoço', amount: 11.00, date: '2024-05-05', iPaid: true },
  ],
  // Adicione mais despesas para outros amigos se necessário
};

export default function FriendExpensesScreen() {
    const insets = useSafeAreaInsets();
    const { friendId, name } = useLocalSearchParams<{ friendId: string; name?: string }>();
    const expenses = MOCK_EXPENSES_DATA[friendId] || [];

    // O nome do amigo é passado como parâmetro de query na navegação
    const friendName = name ? decodeURIComponent(name) : `Amigo ${friendId}`;

    return (
        <View style={{paddingTop: insets.top, flex: 1, backgroundColor: '#f4f6f8'}}>
        <Stack.Screen options={{ title: `Despesas com ${friendName}` }} />
        
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Despesas com {friendName}</Text>
            {/* Aqui poderia adicionar um resumo do saldo com este amigo específico */}
        </View>

        {expenses.length === 0 ? (
            <Text style={styles.noExpensesText}>Ainda não há despesas com {friendName}.</Text>
        ) : (
            expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseIconContainer}>
                {/* Ícone de exemplo, poderia variar com a categoria da despesa */}
                <Ionicons name="receipt-outline" size={24} color="#555" />
                </View>
                <View style={styles.expenseDetails}>
                <Text style={styles.expenseDescription}>{expense.description}</Text>
                <Text style={styles.expenseDate}>{expense.date}</Text>
                </View>
                <View style={styles.expenseAmountContainer}>
                <Text style={[
                    styles.expenseAmount,
                    expense.iPaid ? styles.iPaidColor : styles.friendPaidColor
                ]}>
                    {expense.iPaid ? '+' : '-'} {expense.amount.toFixed(2)} €
                </Text>
                <Text style={styles.paidByText}>
                    {expense.iPaid ? 'Você pagou' : `${friendName.split(' ')[0]} pagou`}
                </Text>
                </View>
            </View>
            ))
        )}
        {/* Botão para adicionar nova despesa com este amigo iria aqui */}
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    noExpensesText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#777',
    },
    expenseItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        marginHorizontal: 10,
        marginTop: 10,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
        width: 0,
        height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2.00,
        elevation: 2,
    },
    expenseIconContainer: {
        marginRight: 15,
        backgroundColor: '#eef1f6',
        padding:10,
        borderRadius: 20,
    },
    expenseDetails: {
        flex: 1,
    },
    expenseDescription: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    expenseDate: {
        fontSize: 13,
        color: '#777',
        marginTop: 3,
    },
    expenseAmountContainer: {
        alignItems: 'flex-end',
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    iPaidColor: {
        color: '#27ae60', // Verde para quando eu paguei (despesa para o amigo)
    },
    friendPaidColor: {
        color: '#e74c3c', // Vermelho para quando o amigo pagou (crédito para mim)
    },
    paidByText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    }
});
