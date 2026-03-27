import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import React, { useRef, useEffect } from 'react';
import { Portal, Modal, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

const Loader = ({ isAnalyzing }) => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const gravityAnim = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnalyzing) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      pulseAnim.setValue(1);
      gradientAnim.setValue(0);
      gravityAnim.setValue(0);
      spinValue.setValue(0);
    }
  }, [
    isAnalyzing,
    fadeAnim,
    scaleAnim,
    pulseAnim,
    gradientAnim,
    gravityAnim,
    spinValue,
  ]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const gradientColors = spinValue.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#4facfe', '#00f2fe', '#fad0c4', '#4facfe'],
  });

  const gravity = spinValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 20, 0],
  });

  return (
    <Portal>
      <Modal
        visible={isAnalyzing}
        dismissable={false}
        contentContainerStyle={styles.modalContent}
      >
        <Animated.View
          style={[
            styles.loaderContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: gravity }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.circleContainer,
              {
                transform: [{ rotate: spin }, { scale: pulseAnim }],
              },
            ]}
          >
            <Animated.View style={styles.circle}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                // start={{ x: 0, y: 0 }}
                // end={{ x: 1, y: 1 }}
              />
            </Animated.View>
            <View style={styles.innerCircle}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        rotate: spinValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </Animated.View>
          <Animated.Text
            style={[
              styles.analyzingText,
              { color: theme.colors.primary },
              { opacity: fadeAnim },
            ]}
          >
            AI Analyzing...
          </Animated.Text>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

export default Loader;

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 0,
  },
  analyzingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
