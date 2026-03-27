import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import Countdown from 'react-native-countdown-component';
import ImageConstant from '../../Constant/ImageConstant';

const TimerScreen = ({
  storedTimestamp = Date.now() + 2 * 60 * 1000,
  onFinish,
}) => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    const fetchStoredTime = async () => {
      if (storedTimestamp) {
        const now = Math.floor(Date.now() / 1000);
        const futureTime = Math.floor(storedTimestamp / 1000);
        const timeLeft = futureTime - now;
        console.log('timeLeft', timeLeft);
        setIsTimerActive(true);
        setRemainingTime(timeLeft);
      }
    };
    fetchStoredTime();
  }, []);

  return (
    <View
      // colors={["#ff7eb3", "#ff758c", "#ff5c8a"]}
      style={styles.container}
    >
      {isTimerActive ? (
        <View style={[styles.timerBox]}>
          <Image source={ImageConstant.timmer} style={styles.icon} />
          <Text style={styles.message}>
            After this time, you can apply / change or modify this setting:
          </Text>
          <Countdown
            until={remainingTime}
            size={30}
            onFinish={() => {
              onFinish ? onFinish() : setIsTimerActive(false);
            }}
            digitStyle={styles.digitStyle}
            digitTxtStyle={styles.digitTxtStyle}
            timeLabelStyle={styles.timeLabelStyle}
            separatorStyle={{ color: '#fff' }}
            timeToShow={['H', 'M', 'S']}
            timeLabels={{ h: 'Hour', m: 'Minutes', s: 'Seconds' }}
          />
        </View>
      ) : (
        <Text style={styles.availableText}>
          You can now modify the settings!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  timerBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  message: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  availableText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    borderRadius: 10,
  },
  digitStyle: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 10,
  },
  digitTxtStyle: {
    color: '#ffcc00',
    fontSize: 28,
    fontWeight: 'bold',
  },
  timeLabelStyle: {
    color: '#fff',
    fontSize: 14,
  },
});

export default TimerScreen;
