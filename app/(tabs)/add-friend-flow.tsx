import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function AddFriendScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Atividade Recente' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Ecrã de Adicionar Amigo</Text>
        <Text style={styles.subtext}>Aqui verá as atividades recentes nos seus grupos e despesas.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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