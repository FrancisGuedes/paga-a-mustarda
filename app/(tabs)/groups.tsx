import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function GroupsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Grupos' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Ecrã de Grupos</Text>
        <Text style={styles.subtext}>Aqui poderá ver e gerir os seus grupos de despesas.</Text>
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