import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React from "react";

const ModelTimeSelect = ({
  timeModalVisible,
  setTimeModalVisible,
  timeOptions,
  handleTimeSelection,
}) => {
  return (
    <>
      <Modal
        visible={timeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setTimeModalVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Choose Block Duration</Text>

            <FlatList
              data={timeOptions}
              contentContainerStyle={{ width: 200 }}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleTimeSelection(item)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>{item}</Text>
                </Pressable>
              )}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{ maxHeight: 200 }} // Set a max height to enable scrolling
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default ModelTimeSelect;

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
