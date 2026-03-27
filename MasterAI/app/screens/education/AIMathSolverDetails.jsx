import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ProgressBar,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../Components/header/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../../Components/Text';
import GolbalStyle from '../../Style';
import { useReportMutation } from '../../features/api/upload/uploadPhoto';
import ReportContentModal from '../../Components/Model/ReportContentModal';

const { width } = Dimensions.get('window');

const AIMathSolverDetails = ({ route }) => {
  const { response } = route.params?.data?.response;
  console.log('response', response);
  const [currentStep, setCurrentStep] = useState(0);
  const [animation] = useState(new Animated.Value(0));
  const celebrationAnimation = useRef(new Animated.Value(0)).current;
  // ... existing state and variables ...
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [currentCaptionId, setCurrentCaptionId] = useState(null);
  const [report] = useReportMutation(); // Initialize report mutation

  const handleReport = async captionId => {
    setCurrentCaptionId(captionId);
    setReportModalVisible(true); // Show the report modal
  };

  const handleSubmitReport = async reportData => {
    console.log(`Report for caption ${currentCaptionId}:`, reportData);
    report(reportData); // Submit the report
    setSnackbarVisible(true);
    setSnackbarMessage(
      `Report for caption ${
        currentCaptionId || Math.random().toString(36).substr(2, 9)
      } submitted.`,
    );
  };
  const animateStep = direction => {
    Animated.timing(animation, {
      toValue: direction === 'next' ? -1 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(prevStep =>
        direction === 'next'
          ? Math.min(response.stepByStepSolution.length - 1, prevStep + 1)
          : Math.max(0, prevStep - 1),
      );
      animation.setValue(0);
    });
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(celebrationAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const celebrationStyle = {
    transform: [
      {
        scale: celebrationAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
      {
        rotate: celebrationAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <LinearGradient colors={['#6200ee', '#9c27b0']} style={styles.container}>
      <Header isBack={true} title="Math Solution" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={GolbalStyle.row} onPress={handleReport}>
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#6200ee"
              ></Ionicons>
              <CustomText text={'Report'} />
            </TouchableOpacity>
            <Text style={styles.title}>{response.problemType}</Text>
            <Text style={styles.subtitle}>Given Information:</Text>
            {response.givenInformation.map((info, index) => (
              <View key={index} style={styles.infoItem}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="#6200ee"
                />
                <Text style={styles.infoText}>{info}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.subtitle}>Solution Approach:</Text>
            <Text style={styles.text}>{response.solutionApproach}</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.stepCard]}>
          <Card.Content>
            <Text style={styles.subtitle}>Step-by-Step Solution:</Text>
            <View style={styles.stepContainer}>
              <Animated.View
                style={[
                  styles.stepContent,
                  {
                    transform: [
                      {
                        translateX: animation.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: [-300, 0, 300],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.stepText}>
                  {response.stepByStepSolution[currentStep]}
                </Text>
              </Animated.View>
              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  onPress={() => animateStep('prev')}
                  disabled={currentStep === 0}
                  style={[
                    styles.navButton,
                    currentStep === 0 && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.navButtonText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.stepIndicator}>
                  Step {currentStep + 1} of {response.stepByStepSolution.length}
                </Text>
                <TouchableOpacity
                  onPress={() => animateStep('next')}
                  disabled={
                    currentStep === response.stepByStepSolution.length - 1
                  }
                  style={[
                    styles.navButton,
                    currentStep === response.stepByStepSolution.length - 1 &&
                      styles.disabledButton,
                  ]}
                >
                  <Text style={styles.navButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ProgressBar
              progress={(currentStep + 1) / response.stepByStepSolution.length}
              color="#6200ee"
              style={styles.progressBar}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.subtitle}>Final Answer:</Text>
            <View style={styles.finalAnswerContainer}>
              <Animated.View
                style={[styles.celebrationContainer, celebrationStyle]}
              >
                <MaterialCommunityIcons
                  name="party-popper"
                  size={40}
                  color="#FFD700"
                />
              </Animated.View>
              <Text style={styles.finalAnswer}>{response.finalAnswer}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.subtitle}>Additional Insights:</Text>
            <Text style={styles.text}>{response.additionalInsights}</Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => {
            /* Implement a fun quiz or interactive element */
          }}
          style={styles.quizButton}
          icon="brain"
        >
          Take a Fun Quiz!
        </Button>
      </ScrollView>
      <ReportContentModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  stepCard: {
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#6200ee',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#9c27b0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  stepContainer: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepContent: {
    minHeight: 120,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  navButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  navButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  stepIndicator: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  progressBar: {
    marginTop: 12,
    height: 8,
    borderRadius: 4,
  },
  finalAnswerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  finalAnswer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 12,
  },
  celebrationContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizButton: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 25,
  },
});

export default AIMathSolverDetails;
