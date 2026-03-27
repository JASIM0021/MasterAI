import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';

const ModelChoseDiffeculity = ({
  difficultyModalVisible,
  setDifficultyModalVisible,
  difficultyLevels,
}) => {
  return (
    <Modal
      visible={difficultyModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setDifficultyModalVisible(false)} // Close modal on back button press
    >
      <Pressable
        style={styles.modalContainer}
        onPress={() => setDifficultyModalVisible(false)}
      >
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <Text style={styles.modalTitle}>Choose Difficulty</Text>
          {difficultyLevels.map((level, index) => (
            <Pressable
              key={index}
              onPress={() => level.onPress()}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>{level.title}</Text>
              <Text style={styles.modalDescription}>{level.description}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ModelChoseDiffeculity;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'blue',
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalDescription: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  input: {
    height: 40,
    borderColor: 'blue',
    borderWidth: 1,
    marginBottom: 10,
    color: 'blue',
    width: '100%',
    paddingHorizontal: 10,
  },
});
