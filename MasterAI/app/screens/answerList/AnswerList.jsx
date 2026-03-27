import React, { useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Card, Text, Divider, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../Components/header/Header';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useRoute } from '@react-navigation/native';
import {
  BannerAdSize,
  TestIds,
  useInterstitialAd,
} from 'react-native-google-mobile-ads';
import BanneerAdd from '../Ads/BanneerAdd';

const QuestionAnswerList = () => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    card: {
      marginBottom: 10,
      borderRadius: 10,
      overflow: 'hidden',
    },
    cardContent: {
      padding: 16,
    },
    questionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    question: {
      color: '#ffffff',
      marginBottom: 8,
      flex: 1,
    },
    answer: {
      color: '#ffffff',
    },
    divider: {
      marginVertical: 8,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 25,
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
  });

  const route = useRoute();
  const data = route.params.data;

  const generateHTML = () => {
    const questionsHtml = data?.response?.answers
      .map(
        (item, index) => `
            <div style="margin-bottom: 20px;">
                <strong>${index + 1}. ${item.question}</strong><br />
                <span>${item.answer}</span>
            </div>
        `,
      )
      .join('');

    return `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            </head>
            <body style="padding: 16px; font-family: Arial, sans-serif;">
                ${questionsHtml}
            </body>
            </html>
        `;
  };

  const handlePrintToFile = async () => {
    const html = generateHTML();
    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  };

  const handleCopyToClipboard = async text => {
    await Clipboard.setStringAsync(text);
    Alert.alert(
      'Copied',
      'The selected question and answer have been copied to the clipboard.',
    );
  };

  const handleCopyAllToClipboard = async () => {
    const text = data?.response?.answers
      .map(
        (item, index) =>
          `${index + 1}. ${item.question}\nAnswer: ${item.answer}\n`,
      )
      .join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'All answers have been copied to the clipboard.');
  };

  const {
    load,
    show,
    error,
    isLoaded,
    isClicked,
    isClosed,
    isOpened,
    revenue,
  } = useInterstitialAd('ca-app-pub-4304822949261068/9793325693');

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isLoaded) {
      console.log(`${Platform.OS} interstitial ad loaded`);
      show();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (error !== undefined) {
      console.log(`${Platform.OS} interstitial hook error: ${error.message}`);
    }
  }, [error]);

  return (
    <>
      <Header isBack={true} title={'Answer list'} />

      <LinearGradient colors={['#6200ee', '#9c27b0']} style={styles.container}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={handlePrintToFile}>
            <LinearGradient
              colors={['#ff6b6b', '#ee5253']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Print Answers</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopyAllToClipboard}>
            <LinearGradient
              colors={['#54a0ff', '#5f27cd']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Copy All to Clipboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <ScrollView>
          {data?.response?.answers?.map((item, index) => (
            <Card key={index.toString()} style={styles.card}>
              <LinearGradient colors={['#4a69bd', '#0c2461']}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.questionContainer}>
                    <Text variant="titleMedium" style={styles.question}>
                      {`${index + 1}. ${item.question}`}
                    </Text>
                    <IconButton
                      icon="content-copy"
                      iconColor="#ffffff"
                      size={20}
                      onPress={() =>
                        handleCopyToClipboard(
                          `${item.question}\nAnswer: ${item.answer}`,
                        )
                      }
                    />
                  </View>
                  <Divider style={styles.divider} />
                  <Text variant="bodyMedium" style={styles.answer}>
                    {item.answer}
                  </Text>
                </Card.Content>
              </LinearGradient>
            </Card>
          ))}
        </ScrollView>
      </LinearGradient>
    </>
  );
};

export default QuestionAnswerList;
