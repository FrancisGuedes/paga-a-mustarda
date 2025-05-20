import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function AddExpenseScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Adicionar' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Ecrã Adicionar (Placeholder)</Text>
        <Text style={styles.subtext}>
          Este ecrã não deveria ser visível diretamente.
          O botão "+" na tab bar deve acionar uma ação (ex: abrir um modal).
        </Text>
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