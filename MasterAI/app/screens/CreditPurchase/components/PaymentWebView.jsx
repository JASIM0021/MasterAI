import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Text, Appbar, ActivityIndicator, Button, Card } from 'react-native-paper';
import { WebView } from 'react-native-webview';

/**
 * RazorpayWebView — renders Razorpay Standard Checkout inside a WebView.
 *
 * Props:
 *   orderData  — { orderId, amount, currency, keyId, packageName, userName, userEmail }
 *   onSuccess  — (razorpayOrderId, razorpayPaymentId, razorpaySignature) => void
 *   onFailure  — (message) => void
 *   onCancel   — () => void
 */
const PaymentWebView = ({ orderData, onSuccess, onFailure, onCancel }) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  const handleBackPress = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: onCancel },
      ]
    );
    return true;
  };

  const generateRazorpayHTML = () => {
    const { orderId, amount, currency, keyId, packageName, userName, userEmail } = orderData;
    // amount is already in paise from the server
    const displayAmount = (amount / 100).toFixed(0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Secure Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #6c47ff 0%, #a78bfa 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: #fff; border-radius: 20px; padding: 32px 24px;
      width: 100%; max-width: 400px; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    }
    .brand { font-size: 28px; margin-bottom: 6px; }
    h2 { color: #1a1a2e; font-size: 22px; margin-bottom: 4px; }
    .pkg { color: #6c47ff; font-size: 15px; margin-bottom: 20px; font-weight: 600; }
    .amount-row {
      background: #f8f7ff; border-radius: 12px; padding: 16px; margin-bottom: 24px;
    }
    .amount { font-size: 36px; font-weight: 800; color: #1a1a2e; }
    .currency { font-size: 16px; color: #666; margin-top: 2px; }
    .loader {
      width: 44px; height: 44px;
      border: 4px solid #eee; border-top-color: #6c47ff;
      border-radius: 50%; animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status-msg { color: #555; font-size: 14px; line-height: 1.5; }
    .secure { color: #aaa; font-size: 12px; margin-top: 20px; }
    .secure span { color: #6c47ff; }
  </style>
</head>
<body>
<div class="card">
  <div class="brand">💳</div>
  <h2>Secure Checkout</h2>
  <div class="pkg">${packageName || 'Credit Package'}</div>
  <div class="amount-row">
    <div class="amount">₹${displayAmount}</div>
    <div class="currency">${currency || 'INR'}</div>
  </div>
  <div class="loader"></div>
  <p class="status-msg" id="msg">Opening Razorpay checkout…</p>
  <div class="secure">Secured by <span>Razorpay</span> 🔒</div>
</div>

<script>
  function postToApp(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function updateMsg(text) {
    document.getElementById('msg').textContent = text;
  }

  var options = {
    key: '${keyId}',
    amount: '${amount}',
    currency: '${currency || 'INR'}',
    order_id: '${orderId}',
    name: 'Master AI',
    description: '${packageName || 'Credits Purchase'}',
    image: '',
    prefill: {
      name: '${(userName || '').replace(/'/g, "\\'")}',
      email: '${(userEmail || '').replace(/'/g, "\\'")}',
    },
    theme: { color: '#6c47ff' },
    modal: {
      ondismiss: function() {
        updateMsg('Payment cancelled.');
        postToApp({ type: 'RAZORPAY_CANCEL' });
      }
    },
    handler: function(response) {
      updateMsg('Payment successful! Verifying…');
      postToApp({
        type: 'RAZORPAY_SUCCESS',
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
    }
  };

  window.addEventListener('load', function() {
    try {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response) {
        updateMsg('Payment failed: ' + (response.error.description || 'Unknown error'));
        postToApp({
          type: 'RAZORPAY_FAILURE',
          message: response.error.description || 'Payment failed',
          code: response.error.code,
        });
      });
      setTimeout(function() { rzp.open(); }, 600);
    } catch(e) {
      updateMsg('Failed to load payment SDK: ' + e.message);
      postToApp({ type: 'RAZORPAY_ERROR', message: e.message });
    }
  });
</script>
</body>
</html>`;
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'RAZORPAY_SUCCESS':
          onSuccess(data.razorpayOrderId, data.razorpayPaymentId, data.razorpaySignature);
          break;
        case 'RAZORPAY_FAILURE':
          onFailure(data.message || 'Payment failed');
          break;
        case 'RAZORPAY_CANCEL':
          onCancel();
          break;
        case 'RAZORPAY_ERROR':
          onFailure(data.message || 'Payment SDK error');
          break;
      }
    } catch (err) {
      console.error('WebView message parse error:', err);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onCancel} />
          <Appbar.Content title="Payment" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorTitle}>Payment Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Button mode="contained" onPress={onCancel} style={{ marginTop: 12 }}>
                Go Back
              </Button>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={handleBackPress} />
        <Appbar.Content title="Secure Payment" subtitle="Powered by Razorpay" />
      </Appbar.Header>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6c47ff" />
          <Text style={styles.loadingText}>Loading payment gateway…</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: generateRazorpayHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onError={(e) => {
          setError('Failed to load payment page. Please check your connection.');
          setLoading(false);
        }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        userAgent={
          Platform.OS === 'android'
            ? 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile Safari/604.1'
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { marginTop: 14, fontSize: 15, color: '#555' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorCard: { width: '100%', maxWidth: 380 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#e53935' },
  errorMessage: { fontSize: 14, textAlign: 'center', color: '#666', lineHeight: 20, marginBottom: 8 },
});

export default PaymentWebView;
