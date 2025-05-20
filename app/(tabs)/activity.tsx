import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Adicionado para responsividade

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();

  return (
    // View externa para aplicar o padding da safe area no topo
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: styles.pageContainer.backgroundColor }}>
      {/* O Stack.Screen define o título do header da navegação */}
      <Stack.Screen options={{ title: 'Atividade' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Ecrã de Atividade</Text>
        <Text style={styles.subtext}>Aqui verá as atividades recentes nos seus grupos e despesas.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: { // Estilo para a View externa que usa insets.top
    flex: 1,
    backgroundColor: '#F4F6F8', // Um cinza claro, pode ajustar
  },
  container: { // Container para o conteúdo principal do ecrã
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    color: 'gray',
  },
});