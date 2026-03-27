import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const UnderDevelopmentScreen = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Icon name="construction" size={100} color="#FF6F00" />

      <Text style={styles.title}>Under Development</Text>

      <Text style={styles.message}>
        This feature is currently under development. Please check back later!
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => {}}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F2F2F2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    color: '#FF6F00',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666666',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#FF6F00',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default UnderDevelopmentScreen;
