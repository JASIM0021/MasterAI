// import { ToastAndroid } from "react-native";
import { showMessage, hideMessage } from "react-native-flash-message";

const showError = (message) => {
  showMessage({
    message,
    type: "danger",
    icon: "danger",
  });
};
const showSuccess = (message) => {
  showMessage({
    message,
    type: "success",
    icon: "success",
  });
};
const showWarn = (message) => {
  showMessage({
    message,
    type: "info",
    icon: "info",
  });
};
// const showToast = (message) => {
//   ToastAndroid.SHORT
//   ToastAndroid.CENTER

//   ToastAndroid.show(message,1000);
// }

export const ShowAlertMsg = { showError, showSuccess ,showWarn};