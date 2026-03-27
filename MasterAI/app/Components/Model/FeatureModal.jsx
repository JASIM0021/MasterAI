import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Modal, Text, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const FeatureModal = ({ visible, onClose, onTryNow }) => {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      onDismiss={onClose}
      contentContainerStyle={styles.modalContainer}
    >
      <LinearGradient
        colors={['#6C48EF', '#8B82FE']}
        style={styles.gradientContainer}
      >
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Decorative Elements */}
          {/* <Image
            source={require('../../assets/eid-star.png')}
            style={styles.decorativeStar}
          /> */}

          {/* Feature Illustration */}
          {/* <Image
            source={require('../../assets/ai-magic.png')}
            style={styles.featureImage}
          /> */}

          {/* Text Content */}
          <Text style={styles.headline}>
            New AI Image Editing is Available! ✨
          </Text>
          <Text style={styles.subText}>
            Enjoy Eid and edit your images hassle-free with our powerful AI
            editor!
          </Text>

          {/* Action Button */}
          <Button
            mode="contained"
            onPress={onTryNow}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
            icon="magic-staff"
          >
            Try Now - FREE
          </Button>
        </View>

        {/* Bottom Decoration */}
        {/* <Image
          source={require('../../assets/eid-star.png')}
          style={styles.bottomPattern}
        /> */}
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientContainer: {
    width: width * 0.9,
    padding: 25,
    paddingTop: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  featureImage: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  headline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  actionButton: {
    borderRadius: 15,
    paddingVertical: 8,
    backgroundColor: '#FFD700',
    width: '100%',
  },
  buttonLabel: {
    color: '#2F2F2F',
    fontWeight: 'bold',
    fontSize: 16,
  },
  decorativeStar: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    opacity: 0.3,
  },
  bottomPattern: {
    position: 'absolute',
    bottom: -20,
    width: '120%',
    height: 100,
    opacity: 0.2,
  },
});

export default FeatureModal;
