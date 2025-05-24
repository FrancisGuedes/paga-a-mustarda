// app/select-date-modal.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Calendar, LocaleConfig, CalendarProps } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';


LocaleConfig.locales['pt'] = {
    monthNames: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],
    monthNamesShort: ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'],
    dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    dayNamesShort: ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'],
    today: "Hoje"
};
LocaleConfig.defaultLocale = 'pt';

export const SELECTED_EXPENSE_DATE_KEY = 'selected_expense_date';

export default function SelectDateScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ currentDate?: string }>(); // Data atual no formato YYYY-MM-DD
    const insets = useSafeAreaInsets();

    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    const [selectedDate, setSelectedDate] = useState<string>(params.currentDate || todayString);

    const onDayPress: CalendarProps['onDayPress'] = (day) => {
        console.log('Dia selecionado', day.dateString);
        setSelectedDate(day.dateString);
    };

    const handleDone = async () => {
        try {
            await AsyncStorage.setItem(SELECTED_EXPENSE_DATE_KEY, selectedDate);
            console.log(`[SelectDateModal] Data selecionada (${selectedDate}) guardada no AsyncStorage.`);
            if (router.canGoBack()) {
                router.back();
            }
        } catch (e) {
            console.error("Erro ao guardar data selecionada:", e);
            Alert.alert("Erro", "Não foi possível guardar a data selecionada.");
        }
    };

    useEffect(() => {
        navigation.setOptions({
            presentation: 'modal',
            headerShown: true, // Garante que o header é mostrado
            title: 'Escolha a data', // Título como na imagem
            headerLeft: () => (
                Platform.OS === 'ios' ? (
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>Cancelar</Text>
                </TouchableOpacity>
                ) : null
            ),
            headerRight: () => (
                <TouchableOpacity onPress={handleDone} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, styles.headerButtonDone]}>Concluído</Text>
                </TouchableOpacity>
            ),
            headerTitleStyle: styles.headerTitleStyle, // Estilo para o título do header
            headerStyle: styles.headerStyle, // Estilo para a barra do header
        });
    }, [navigation, router, handleDone]); 

    return (
        <View style={[styles.screenContainer, { paddingTop: insets.top, paddingBottom: insets.bottom || 10 }]}>
            <View style={styles.screenContentContainer}>
                <Calendar
                    current={selectedDate} // Data inicial para o calendário
                    minDate={'2000-01-01'} // Data mínima selecionável
                    maxDate={todayString} // Data máxima selecionável (hoje)
                    onDayPress={onDayPress}
                    monthFormat={'MMMM yyyy'}
                    hideExtraDays={true}
                    firstDay={1} // Segunda-feira como primeiro dia da semana
                    enableSwipeMonths={true}
                    markedDates={{
                        [selectedDate]: { selected: true, marked: true, selectedColor: '#007AFF' },
                        [todayString]: { marked: true, dotColor: '#007AFF', activeOpacity: 0 } // Marca o dia de hoje
                    }}
                    theme={{
                        arrowColor: '#007AFF',
                        todayTextColor: '#007AFF',
                        selectedDayBackgroundColor: '#007AFF',
                        selectedDayTextColor: '#ffffff',
                        // Pode personalizar mais o tema aqui
                    }}
                    style={styles.calendar}
                />
            </View>
            <View style={styles.bottomOptionsSectionContainer}>
                <TouchableOpacity 
                    style={styles.bottomOptionButtonLeft} // Estilo para o botão da esquerda
                    onPress={() => Alert.alert("Repetir", "Funcionalidade ainda não implementada.")}
                >
                    <Text style={styles.bottomOptionText}>Repetir</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.bottomOptionButtonRight} // Estilo para o botão da direita
                    onPress={() => Alert.alert("Tipo de Repetição", "Funcionalidade ainda não implementada.")}
                >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.bottomOptionValue}>Apenas desta vez</Text>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: Platform.OS === 'ios' ? '#FFFFFF' : '#FFFFFF', // Fundo ligeiramente diferente para iOS modal
    },
    screenContentContainer: {
        paddingHorizontal: '8%',
    },
    headerButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    headerButtonText: {
        color: '#007AFF',
        fontSize: 17,
    },
    headerButtonDone: {
        fontWeight: '600', // "Concluído" em negrito como no iOS
    },
    calendar: {
        borderWidth: 0,
    },
    headerTitleStyle: { 
    // fontWeight: '600',
    // fontSize: 17,
    },
    headerStyle: { // Estilo para a barra do header
        backgroundColor: Platform.OS === 'ios' ? '#F7F7F7' : '#FFFFFF', // Fundo do header
        // borderBottomWidth: Platform.OS === 'android' ? 1 : 0, // Linha no Android
        // borderBottomColor: Platform.OS === 'android' ? '#D1D1D6' : undefined,
    },
    bottomOptionsContainer: {
        marginTop: 20, // Espaço acima das opções inferiores
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF' // Fundo branco para a secção de opções
    },
    bottomOptionButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    bottomOptionText: {
        fontSize: 17,
        color: '#000000',
    },
    bottomOptionValue: {
        fontSize: 17,
        color: '#8E8E93', // Cinza para o valor
        marginRight: 6,
    },
    bottomOptionsSectionContainer: {
        flexDirection: 'row', // <--- ALTERADO: para colocar os botões em linha
        justifyContent: 'space-between', // <--- ALTERADO: para empurrar para os extremos
        alignItems: 'center', // <--- ALTERADO: para alinhar verticalmente
        marginTop: 20, // Espaço entre o calendário e esta secção
        paddingVertical: 8, 
        paddingHorizontal: 16, // Padding horizontal para a secção inteira
        backgroundColor: '#FFFFFF', 
    },
    bottomOptionButtonLeft: {
        paddingVertical: 12, 
        alignItems: 'flex-start', // Se quiser o texto alinhado à esquerda dentro do botão
    },
    bottomOptionButtonRight: {
        paddingVertical: 12,
        alignItems: 'flex-end', // Se quiser o conteúdo alinhado à direita dentro do botão
    },
});