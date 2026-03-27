import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { SCREEN_NAME } from '../../Constant';
import { useNavigation } from '@react-navigation/native';

const GuardianScreen = () => {
  const [selectedTime, setSelectedTime] = useState(0); // In hours
  const [restrictedApp, setRestrictedApp] = useState('');
  const [safetyEnabled, setSafetyEnabled] = useState(false);

  // Use official navigation hook
  const navigation = useNavigation();

  const featureList = [
    {
      id: '1',
      title: 'AI Content Blocker',
      description:
        'Blocks any illegal content for safer browsing of your children.',
      icon: 'shield-checkmark',
      onPress: () => {
        navigation.navigate(SCREEN_NAME.ContentBlocker);
      },
    },
    {
      id: '4',
      title: 'Usage Reports',
      description: 'Get detailed reports of browsing activity.',
      icon: 'document-text',
    },
    {
      id: '5',
      title: 'App Restriction',
      description: 'Restrict any application usage for a specific period.',
      icon: 'apps',
    },
    {
      id: '6',
      title: 'Women Safety Guardian',
      description: 'Check your safety every 10 minutes via notifications.',
      icon: 'notifications',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>AI Guardian Features</Text>
      <FlatList
        data={featureList}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.featureItem} onPress={item.onPress}>
            <Ionicons
              name={item.icon}
              size={30}
              color="#007bff"
              style={styles.icon}
            />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007bff',
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 5,
    elevation: 2,
  },
  icon: {
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sliderContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 5,
    elevation: 2,
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GuardianScreen;
