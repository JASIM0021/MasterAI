import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import React from "react";
import { Pressable } from "react-native";

const ModelBackUpPhone = ({
  setBackupModalVisible,
  backupNumber,
  setBackupNumber,
  backupModalVisible,
  handleBackupSubmit,
}) => {
  return (
    <Modal
      visible={backupModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setBackupModalVisible(false)}
    >
      <Pressable
        style={styles.modalContainer}
        onPress={() => setBackupModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Enter Backup Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Backup Phone Number"
            value={backupNumber}
            onChangeText={setBackupNumber}
            keyboardType="phone-pad"
          />
          <Pressable onPress={handleBackupSubmit} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>Submit</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default ModelBackUpPhone;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "blue",
  },
  modalButton: {
    backgroundColor: "#007bff",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  modalDescription: {
    color: "#555",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },
  input: {
    height: 40,
    borderColor: "blue",
    borderWidth: 1,
    marginBottom: 10,
    color: "blue",
    width: "100%",
    paddingHorizontal: 10,
  },
});
