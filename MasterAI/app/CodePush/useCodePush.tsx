// import { useEffect, useState } from 'react';

// import * as SplashScreen from 'expo-splash-screen';
// import codePush, { DownloadProgress } from 'react-native-code-push';

// interface UseCodePushReturn {
//   syncMessage?: string;
//   progress?: string;
// }

// const useCodePush = (isLoading: boolean): UseCodePushReturn => {
//   const [syncMessage, setSyncMessage] = useState<string>();
//   const [progress, setProgress] = useState<string>();

//   const syncStatusChangedCallback = (syncStatus: codePush.SyncStatus) => {
//     switch (syncStatus) {
//       case codePush.SyncStatus.CHECKING_FOR_UPDATE:
//         setSyncMessage('Checking for update...');
//         break;
//       case codePush.SyncStatus.DOWNLOADING_PACKAGE:
//         setSyncMessage('Downloading update...');
//         break;
//       case codePush.SyncStatus.AWAITING_USER_ACTION:
//         setSyncMessage('User waiting...');
//         break;
//       case codePush.SyncStatus.INSTALLING_UPDATE:
//         setSyncMessage('Loading update...');
//         break;
//       case codePush.SyncStatus.UP_TO_DATE:
//         setSyncMessage('The app is up to date...');
//         break;
//       case codePush.SyncStatus.UPDATE_IGNORED:
//         setSyncMessage('Update canceled by user...');
//         break;
//       case codePush.SyncStatus.UPDATE_INSTALLED:
//         setSyncMessage('Update installed, Application restarting...');
//         break;
//       case codePush.SyncStatus.UNKNOWN_ERROR:
//         setSyncMessage('An error occurred during the update...');
//         break;
//       default:
//         setSyncMessage(undefined);
//         break;
//     }
//   };

//   const downloadProgressCallback = ({
//     receivedBytes,
//     totalBytes,
//   }: DownloadProgress) => {
//     const currentProgress = Math.round((receivedBytes / totalBytes) * 100);
//     setProgress(`${currentProgress} %`);
//   };

//   useEffect(() => {
//     if (!isLoading) {
//       SplashScreen.hideAsync(); // Updated to use Expo's SplashScreen
//       if (!__DEV__) {
//         codePush.notifyAppReady();
//         codePush.checkForUpdate().then(update => {
//           if (update) {
//             codePush.sync(
//               { installMode: codePush.InstallMode.IMMEDIATE },
//               syncStatusChangedCallback,
//               downloadProgressCallback,
//             );
//           }
//         });
//       }
//     }
//   }, [isLoading]);

//   return {
//     syncMessage,
//     progress,
//   };
// };

// export default useCodePush;
