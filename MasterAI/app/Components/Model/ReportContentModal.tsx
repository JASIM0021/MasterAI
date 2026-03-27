import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

const ReportContentModal = ({ visible, onClose, onSubmit }) => {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    const reportData = {
      user_name: userName,
      email: email,
      feedback: prompt,
    };
    onSubmit(reportData);
    setUserName('');
    setEmail('');
    setPrompt('');

    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.gradientBackground}
        >
          <View style={styles.modalContent}>
            <TextInput
              placeholder="Your Name"
              value={userName}
              onChangeText={setUserName}
              style={styles.input}
            />
            <TextInput
              placeholder="Your Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
            />
            <TextInput
              placeholder="Describe your report"
              value={prompt}
              onChangeText={setPrompt}
              style={styles.input}
              multiline
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  gradientBackground: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
  },
  modalContent: {
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'white',
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    color: 'white', // Change text color to white for better visibility
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#4c669f',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ReportContentModal;
