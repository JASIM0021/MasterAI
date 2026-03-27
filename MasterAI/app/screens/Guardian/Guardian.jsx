import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  Alert,
  NativeModules,
  AccessibilityInfo,
  Platform,
  ScrollView,
  PermissionsAndroid,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import TimerScreen from '../../Components/Timmer/Timmer';
import ModelTimeSelect from '../../Components/Model/ModelTimeSelect';
import ModelChoseDiffeculity from '../../Components/Model/ModelChoseDiffeculity';
import ModelBackUpPhone from '../../Components/Model/ModelBackUpPhone';
import { appConstant } from '../../Constant';
import { LinearGradient } from 'expo-linear-gradient';
const { AllNativeModule, SharedPreferencesModule } = NativeModules;

// Request Admin Permission (Prevents Uninstall)
const requestAdminPermission = async () => {
  await AllNativeModule.activeAdminPermission();
};

// Request Overlay Permission (Shows Alert Over Other Apps)
const requestOverlayPermission = () => {
  AllNativeModule.requestOverlayPermission();
};

// Request Accessibility Permission (Monitors Input for Blocking)
const requestAccessibilityPermission = () => {
  AllNativeModule?.requestAccessibilityPermission();
};

const Guardian = () => {
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false); // New state for backup number modal
  const [selectedTime, setSelectedTime] = useState(
    SharedPreferencesModule.getString(
      appConstant.shared_prev_Key.keyword_filtering_time,
      '',
    ),
  );
  const [timeChosen, setTimeChosen] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [backupNumber, setBackupNumber] = useState(''); // New state for backup number
  const [activePermission, setActivePermission] = useState({
    admin: false,
    accessibility: false,
    displayOverLay: false,
  });

  const startMonitoring = () => {
    AllNativeModule?.startMonitoring();
    const timestamp = convertToTimestamp(selectedTime);
    setSelectedTime(timestamp);
  };

  const blockerOptions = [
    {
      title: '🔒 Block Keyword',
      description:
        'Easily block specific keywords to enhance your security! 🛡️',
      onPress: () => {
        requestOverlayPermission();
        requestAdminPermission();
        requestAccessibilityPermission();
        showAlert();
        
      },
    },
    // {
    //   title: "➕ Block Add",
    //   description:
    //     "Add unwanted contacts or numbers to your block list effortlessly! 🚫",
    //   onPress: () => {
    //     // requestAccessibilityPermission();
    //     setTimeModalVisible(true);
    //   },
    // },
    // {
    //   title: "🌐 Block Website",
    //   description:
    //     "Prevent access to harmful websites and keep your browsing safe! 🔍",
    //   onPress: () => {
    //     requestAccessibilityPermission();
    //   },
    // },
  ];

  async function checkPermissions() {
    const isAdmin = await AllNativeModule.isAdminGranted();
    const isOverlay = await AllNativeModule.isOverlayGranted();
    const isAccessibility = await AllNativeModule.isAccessibilityGranted();

    setActivePermission({
      admin: isAdmin,
      displayOverLay: isOverlay,
      accessibility: isAccessibility,
    });
    console.log('Admin:', isAdmin);
    console.log('Overlay:', isOverlay);
    console.log('Accessibility:', isAccessibility);
  }

  const convertToTimestamp = time => {
    const now = Date.now();
    const timeMap = {
      '1 min': now + 1 * 60 * 1000,
      '2 min': now + 2 * 60 * 1000,
      '5 min': now + 5 * 60 * 1000,
      '10 min': now + 10 * 60 * 1000,
      '30 min': now + 30 * 60 * 1000,
      '1 hour': now + 60 * 60 * 1000,
      '3 hours': now + 3 * 60 * 60 * 1000,
      '24 hours': now + 24 * 60 * 60 * 1000,
      '3D': now + 3 * 24 * 60 * 60 * 1000,
      '1W': now + 7 * 24 * 60 * 60 * 1000,
      '3W': now + 21 * 24 * 60 * 60 * 1000,
      '1M': now + 30 * 24 * 60 * 60 * 1000,
      '3M': now + 90 * 24 * 60 * 60 * 1000,
      '6M': now + 180 * 24 * 60 * 60 * 1000,
      '1Y': now + 365 * 24 * 60 * 60 * 1000,
    };

    return timeMap[time] || now; // Default to now if not found
  };

  const timeOptions = [
    '1 min',
    '2 min',
    '5 min',
    '10 min',
    '30 min',
    '1 hour',
    '3 hours',
    '24 hours',
    '3D',
    '1W',
    '3W',
    '1M',
    '3M',
    '6M',
    '1Y',
  ];

  const requestNotificationPermission = async () => {
    try {
      const granted = await AllNativeModule.requestNotificationPermission();
      if (granted) {
        AllNativeModule.activeEasy();
      } else {
        Alert.alert(
          'Permission Denied',
          'Notification permission is required.',
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const checkNotificationPermission = async () => {
    const isEnabled = await AllNativeModule.areNotificationsEnabled();
    if (!isEnabled) {
      Alert.alert(
        'Enable Notifications',
        'Please enable notifications in settings.',
      );
    } else {
      AllNativeModule.activeEasy();
    }
  };

  const difficultyLevels = [
    {
      title: '😊 Easy',
      description:
        'You can change this setting anytime or disable via notifications. 🔄',
      onPress: () => {
        SharedPreferencesModule.saveString(
          appConstant.shared_prev_Key.keyword_filtering_time,
          `${selectedTime}`,
        );
        SharedPreferencesModule.saveString(
          appConstant.shared_prev_Key.keyword_filtering_type,
          appConstant.diffeculity.easy,
        );
        setDifficultyModalVisible(false);
        requestNotificationPermission();
        startMonitoring();
      },
    },
    {
      title: '😐 Mid',
      description:
        'Requires a stop-filtering request from your recovery phone number. 📱',
      onPress: () => {
        SharedPreferencesModule.saveString(
          appConstant.shared_prev_Key.keyword_filtering_time,
          `${selectedTime}`,
        );
        SharedPreferencesModule.saveString(
          appConstant.shared_prev_Key.keyword_filtering_type,
          appConstant.diffeculity.mid,
        );

        setBackupModalVisible(true);
        startMonitoring();
      },
    },
    {
      title: '😨 Hard',
      description: 'Cannot be disabled until the time expires. ⏳',
      onPress: async () => {
        const isAdminGrant = await AllNativeModule.isAdminGranted();

        if (isAdminGrant) {
          setDifficultyModalVisible(false);
          SharedPreferencesModule.saveString(
            appConstant.shared_prev_Key.keyword_filtering_time,
            `${selectedTime}`,
          );
          await SharedPreferencesModule.saveString(
            appConstant.shared_prev_Key.keyword_filtering_type,
            appConstant.diffeculity.hard,
          );
        } else {
          await AllNativeModule.activeAdminPermission();
          setDifficultyModalVisible(false);
          SharedPreferencesModule.saveString(
            appConstant.shared_prev_Key.keyword_filtering_time,
            `${selectedTime}`,
          );
          await SharedPreferencesModule.saveString(
            appConstant.shared_prev_Key.keyword_filtering_type,
            appConstant.diffeculity.hard,
          );
        }
        startMonitoring();
      },
    },
  ];

  const handleTimeSelection = time => {
    setTimeChosen(time);

    setTimeModalVisible(false);
    setDifficultyModalVisible(true);
  };

  const handleDifficultySelection = difficulty => {
    setSelectedDifficulty(difficulty);
    setDifficultyModalVisible(false);
    if (difficulty === '😐 Mid') {
      setPhoneModalVisible(true);
    } else {
      confirmBlocking();
    }
  };

  const handleBackupSubmit = () => {
    if (backupNumber.length < 10) {
      Alert.alert(
        'Invalid Backup Phone',
        'Please enter a valid backup phone number.',
      );
      return;
    }
    setBackupModalVisible(false);
    confirmBlocking();
  };

  const confirmBlocking = async () => {
    Alert.alert(
      'Blocking Started!',
      `Keyword blocked for ${selectedTime} with MID difficulty.`,
      [{ text: 'OK' }],
    );

    // Request SMS_RECEIVED permission in React Native
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'SMS Permission',
        message: 'This app needs access to your SMS to block keywords.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      await SharedPreferencesModule.saveString(
        appConstant.shared_prev_Key.keyword_filtering_type,
        appConstant.diffeculity.mid,
      );
      await SharedPreferencesModule.saveString(
        appConstant.shared_prev_Key.blocking_off_sms.key,
        appConstant.shared_prev_Key.blocking_off_sms.on,
      );
      await SharedPreferencesModule.saveString(
        appConstant.shared_prev_Key.filter_buckup_phone,
        backupNumber,
      );
    } else {
      Alert.alert(
        'Permission Denied',
        'SMS_RECEIVED permission is required to block keywords.',
      );
    }
  };
  const fetchStoredTime = async () => {
    const storedTime = await SharedPreferencesModule.getString(
      appConstant.shared_prev_Key.keyword_filtering_time,
      '',
    );

    setSelectedTime(storedTime);
  };

  const showAlert = () => {
    Alert.alert(
      'Enable Guardian Mode',
      'Guardian Mode uses AccessibilityService to detect harmful or illegal content displayed on your screen. No data is collected or shared. Do you want to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Proceed',
          onPress: () => {
            requestAccessibilityPermission();
            setTimeModalVisible(true);
          },
        },
      ],
      { cancelable: true },
    );
  };
  useEffect(() => {
    fetchStoredTime();
  }, []);

  useEffect(() => {
    checkPermissions();
  }, []);

  return (
    <LinearGradient colors={['#00c6ff', '#0072ff']} style={styles.container}>
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        {selectedTime > Date.now() ? (
          <TimerScreen
            storedTimestamp={selectedTime}
            onFinish={() => {
              setSelectedTime('');
              fetchStoredTime();
            }}
          />
        ) : (
          blockerOptions.map((item, index) => (
            <Pressable
              key={index}
              onPress={item.onPress}
              style={styles.optionContainer}
            >
              <Icon name="power" size={60} />
              <Text style={styles.optionTitle}>Active Now</Text>

              {/* <Text style={styles.optionDescription}>{item.description}</Text>  */}
            </Pressable>
          ))
        )}
      </View>

      <ModelTimeSelect
        handleTimeSelection={handleTimeSelection}
        setTimeModalVisible={setTimeModalVisible}
        timeModalVisible={timeModalVisible}
        timeOptions={timeOptions}
      />

      {/* Difficulty Selection Modal */}
      <ModelChoseDiffeculity
        difficultyLevels={difficultyLevels}
        difficultyModalVisible={difficultyModalVisible}
        setDifficultyModalVisible={setDifficultyModalVisible}
      />

      <ModelBackUpPhone
        backupModalVisible={backupModalVisible}
        backupNumber={backupNumber}
        setBackupModalVisible={setBackupModalVisible}
        setBackupNumber={setBackupNumber}
        handleBackupSubmit={handleBackupSubmit}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          backgroundColor: '#4a4a4a',
          padding: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: 'yellow',
        }}
      >
        <Icon name="information" size={60} color="yellow" />
        <Text
          style={{
            color: 'yellow',
            marginTop: 10,
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 20,
          }}
        >
          🔒✨ Block Keywords for a Safer Experience! 🚀
        </Text>
        <Text style={{ color: 'white', marginTop: 10, fontSize: 16 }}>
          🚫💬 Effortlessly block unwanted keywords based on your chosen
          difficulty levels: 🟢 Easy, 🟡 Medium, and 🔴 Hard! Once you set a
          time period, you can freely search, browse, or type any restricted
          keywords on your device until this feature is turned off. Stay secure
          and in control! 🔍🛡️
        </Text>
      </View>
    </LinearGradient>
  );
};

export default Guardian;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    // justifyContent: "center",
  },
  optionContainer: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    width: '90%',
    marginVertical: 10,
    alignItems: 'center',
  },
  optionTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  optionDescription: {
    color: '#dfe6e9',
    fontSize: 14,
    marginTop: 5,
  },
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
