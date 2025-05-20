import { View, Text, StyleSheet, Button } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; // Ajuste o caminho se necessário
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountScreen() {
    const insets = useSafeAreaInsets();
    const { auth, logout } = useAuth(); // Para o botão de logout

    const handleLogout = async () => {
        try {
            await logout();
            // A navegação para login é tratada pelo app/_layout.tsx
        } catch (error) {
            console.error("Erro ao fazer logout no ecrã de Conta:", error);
            // Pode querer mostrar um Alert aqui
        }
    };

    return (
        <>
        <Stack.Screen options={{ title: 'Conta' }} />
        <View style={{flex: 1, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={styles.text}>Ecrã da Conta</Text>
            {auth.user && (
            <Text style={styles.subtext}>
                Logado como: {auth.user.displayName || auth.user.email}
            </Text>
            )}
            <View style={{ marginTop: 20, width: '60%' }}>
            <Button
                title="Logout"
                onPress={handleLogout}
                color="#e74c3c"
                disabled={auth.isLoading}
            />
            </View>
            <Text style={styles.subtext}>Aqui poderá gerir as suas definições de conta e perfil.</Text>
        </View>
        </>
    );
    }

    const styles = StyleSheet.create({
    text: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtext: {
        fontSize: 16,
        textAlign: 'center',
        color: 'gray',
    },
});