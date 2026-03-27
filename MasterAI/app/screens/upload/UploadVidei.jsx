import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import {
  Button,
  Divider,
  useTheme,
  TouchableRipple,
  ActivityIndicator,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Video } from 'expo-av';
import Header from '../../Components/header/Header';
import CustomText from '../../Components/Text';
import { responsiveHeight } from '../../themes';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import GolbalStyle from '../../Style';
import { useDispatch } from 'react-redux';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import BanneerAdd from '../Ads/BanneerAdd';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { useUploadPhotoMutation } from '../../features/api/upload/uploadPhoto';

const UploadVideo = () => {
  const theme = useTheme();
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    title: {
      marginBottom: 20,
    },
    divider: {
      width: '100%',
      marginVertical: 20,
    },
    button: {
      marginVertical: 10,
      width: '100%',
    },
    video: {
      width: '100%',
      height: 200,
      borderRadius: 10,
      resizeMode: 'contain',
    },
    camera: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    cameraButtonContainer: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 20,
    },
    cameraBox: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 10,
      borderStyle: 'dashed',
    },
    btn: {
      height: responsiveHeight / 10 + 50,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      columnGap: 10,
      width: '100%',
    },
    nextBtn: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      left: 20,
    },
    timerText: {
      fontSize: 40,
      color: 'red',
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 1,
    },
  });

  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [camera, setCamera] = useState(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [captureDisabled, setCaptureDisabled] = useState(false);
  const navigation = useNavigationHelper();
  const [uploadVideoApi, { isError, isLoading, data, isSuccess }] =
    useUploadPhotoMutation();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.QuestionAnswerList,
        data: data,
      });
    }

    if (isError) {
      Alert.alert('Error', 'Something went wrong, please try again');
    }
  }, [isSuccess, isError]);

  const handleCaptureVideo = async () => {
    if (camera) {
      setIsRecording(true);
      setCaptureDisabled(true);
      setTimer(10); // Set the timer to 10 seconds

      const interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            clearInterval(interval);
            setIsRecording(false);
            camera.stopRecording(); // Automatically stop recording after 10 seconds
          }
          return prevTimer - 1;
        });
      }, 1000);

      const video = await camera.recordAsync({
        maxDuration: 10, // Limit the recording to 10 seconds
        mute: true,
      });

      setVideoUri(video.uri);
      setIsCameraVisible(false);
      setIsRecording(false);
      clearInterval(interval);
      setIsCameraVisible(false);
    }
  };

  const handleCancelRecording = () => {
    if (isRecording) {
      camera.stopRecording();
      setIsRecording(false);
      setIsCameraVisible(false);
    }
  };

  const handleUploadFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 10,
    });

    if (!result.canceled) {
      console.log('result.assets[0]', result.assets[0]);

      if (result.assets[0].duration >= 22000) {
        Alert.alert('Video within 10 secound are allowed');
      } else {
        setVideoUri(result.assets[0].uri);
      }
    }
  };

  const uploadtoGimini = async () => {
    if (videoUri) {
      const fileName = videoUri.split('/').pop();
      const fileType = fileName.split('.').pop();

      console.log('videoUri', videoUri);
      console.log('fileName', fileName);
      const formData = new FormData();
      formData.append('image', {
        uri: videoUri,
        name: fileName,
        type: `video/mp4`,
      });

      try {
        const response = await uploadVideoApi(formData).unwrap();
        console.log('Upload success:', response);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  if (hasCameraPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasCameraPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Header isBack={true} title={'Upload Video'} />
      {isCameraVisible ? (
        <Camera style={styles.camera} ref={setCamera}>
          {isRecording && <Text style={styles.timerText}>{timer}s</Text>}
          <View style={styles.cameraButtonContainer}>
            <Button
              mode="contained"
              onPress={handleCaptureVideo}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              disabled={captureDisabled}
            >
              Capture Video
            </Button>
            <Button
              mode="contained"
              onPress={handleCancelRecording}
              style={[
                styles.button,
                { backgroundColor: theme.colors.secondary },
              ]}
            >
              Cancel
            </Button>
          </View>
        </Camera>
      ) : (
        <>
          <View style={{ ...GolbalStyle.row, justifyContent: 'space-between' }}>
            <Text variant="headlineLarge" style={styles.title}>
              Upload Video
            </Text>
            <TouchableRipple
              style={GolbalStyle.btnSmall}
              onPress={() => {
                navigation.push({
                  screen: SCREEN_NAME.UploadPhoto,
                  data: {},
                });
              }}
            >
              <Text style={{ color: 'white' }}>USE Photo</Text>
            </TouchableRipple>
          </View>
          <Divider style={styles.divider} />
          <BanneerAdd.BannerTest
            bannerAdSize={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
          {/* <BanneerAdd.BannerTest bannerAdSize={BannerAdSize.FULL_BANNER} /> */}
          <Divider style={styles.divider} />
          <View style={styles.cameraBox}>
            {videoUri && (
              <Video
                source={{ uri: videoUri }}
                style={styles.video}
                useNativeControls
                resizeMode="contain"
              />
            )}

            <View style={{ ...GolbalStyle.column, width: '100%' }}>
              <TouchableRipple
                style={styles.btn}
                rippleColor={theme.colors.primary}
                onPress={() => setIsCameraVisible(true)}
              >
                <>
                  <EvilIcons name="camera" size={22} />
                  <CustomText text={'Capture Video'} textAlign={'center'} />
                </>
              </TouchableRipple>

              <TouchableRipple
                style={styles.btn}
                rippleColor={theme.colors.primary}
                onPress={() => handleUploadFromGallery()}
              >
                <>
                  <FontAwesome name="photo" size={22} />
                  <CustomText
                    text={'Upload from Gallery'}
                    textAlign={'center'}
                  />
                </>
              </TouchableRipple>
            </View>
          </View>
          <Divider style={styles.divider} />
          <BanneerAdd.BannerTest bannerAdSize={BannerAdSize.FULL_BANNER} />
          <View style={styles.nextBtn}>
            <BanneerAdd.CollapsibleBannerTest />

            <TouchableRipple
              style={{ ...styles.btn, backgroundColor: theme.colors.primary }}
              rippleColor={theme.colors.primary}
              onPress={() => uploadtoGimini()}
            >
              <>
                {isLoading ? (
                  <ActivityIndicator
                    color={theme.colors.background}
                    size={'small'}
                  />
                ) : (
                  <CustomText
                    text={'Next'}
                    size={'lg'}
                    color={'white'}
                    bold={'bold'}
                    textAlign={'center'}
                  />
                )}
              </>
            </TouchableRipple>
          </View>
        </>
      )}
    </View>
  );
};

export default UploadVideo;
