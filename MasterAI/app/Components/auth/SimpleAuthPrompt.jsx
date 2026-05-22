import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { authSuccess } from '../../features/auth/authSlice';
import AUTH_CONFIG from '../../config/authConfig';

const { width } = Dimensions.get('window');

// view states: 'login' | 'register' | 'verify-otp' | 'forgot-password'

const SimpleAuthPrompt = ({ customMessage = null, onAuthSuccess = null }) => {
  const dispatch = useDispatch();
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  // form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    GoogleSignin.configure(AUTH_CONFIG.google);
    setGoogleConfigured(true);
  }, []);

  const authBaseUrl = AUTH_CONFIG.api.authBaseUrl;

  const storeAndDispatch = async (data) => {
    await AsyncStorage.setItem('userToken', data.token);
    await AsyncStorage.setItem('userData', JSON.stringify(data.user));
    dispatch(authSuccess({ user: data.user, token: data.token, method: 'email' }));
    if (onAuthSuccess) onAuthSuccess(data.user);
  };

  // ── Email/Password Login ──────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const res = await axios.post(`${authBaseUrl}login`, { email, password });
      if (res.data.success) {
        await storeAndDispatch(res.data);
      } else {
        Alert.alert('Login Failed', res.data.message || 'Invalid credentials');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'All fields are required');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await axios.post(`${authBaseUrl}register`, { name, email, password });
      if (res.data.success) {
        setView('verify-otp');
      } else {
        Alert.alert('Error', res.data.message || 'Registration failed');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return Alert.alert('Error', 'Enter the 6-digit OTP');
    setLoading(true);
    try {
      const res = await axios.post(`${authBaseUrl}verify-otp`, { email, otp });
      if (res.data.success) {
        await storeAndDispatch(res.data);
      } else {
        Alert.alert('Error', res.data.message || 'OTP verification failed');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await axios.post(`${authBaseUrl}resend-otp`, { email });
      Alert.alert('Sent', 'A new OTP has been sent to your email');
    } catch {
      Alert.alert('Error', 'Could not resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ───────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email) return Alert.alert('Error', 'Enter your email address');
    setLoading(true);
    try {
      await axios.post(`${authBaseUrl}forgot-password`, { email });
      Alert.alert('Sent', 'If an account exists, a reset OTP has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In ────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const currentUser = GoogleSignin.getCurrentUser();
      if (currentUser) await GoogleSignin.signOut().catch(() => {});

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const { idToken, user } = result.data || {};
      if (!idToken) throw new Error('No ID token received');

      try {
        const cred = auth.GoogleAuthProvider.credential(idToken);
        await auth().signInWithCredential(cred);
      } catch {}

      const res = await axios.post(`${authBaseUrl}google`, {
        idToken,
        user: { id: user?.id, name: user?.name, email: user?.email, photo: user?.photo },
      });

      if (res.data.success) {
        await AsyncStorage.setItem('userToken', res.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
        await AsyncStorage.setItem('lastSignInMethod', 'google');
        dispatch(authSuccess({ user: res.data.user, token: res.data.token, method: 'google' }));
        if (onAuthSuccess) onAuthSuccess(res.data.user);
      } else {
        Alert.alert('Error', res.data.message || 'Authentication failed');
      }
    } catch (err) {
      if (err?.code !== 'SIGN_IN_CANCELLED' && err?.code !== 12501) {
        Alert.alert('Google Sign-In Error', err?.message || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────
  const InputField = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, right }) => (
    <View style={styles.inputWrapper}>
      <MaterialCommunityIcons name={icon} size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
      />
      {right}
    </View>
  );

  const PrimaryButton = ({ label, onPress, disabled }) => (
    <TouchableOpacity style={[styles.primaryBtn, disabled && { opacity: 0.6 }]} onPress={onPress} disabled={disabled}>
      {loading ? <ActivityIndicator color="#6c47ff" size="small" /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  );

  const renderOtpView = () => (
    <View style={styles.formArea}>
      <Text style={styles.viewTitle}>Verify Email</Text>
      <Text style={styles.viewSubtitle}>We sent a 6-digit code to {email}</Text>

      <InputField icon="shield-key" placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />

      <PrimaryButton label="Verify" onPress={handleVerifyOtp} disabled={loading} />

      <TouchableOpacity onPress={handleResendOtp} style={styles.linkRow}>
        <Text style={styles.linkText}>Didn't receive it? </Text>
        <Text style={[styles.linkText, styles.linkBold]}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotView = () => (
    <View style={styles.formArea}>
      <Text style={styles.viewTitle}>Reset Password</Text>
      <Text style={styles.viewSubtitle}>Enter your email to receive a reset code</Text>

      <InputField icon="email-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />

      <PrimaryButton label="Send Reset Code" onPress={handleForgotPassword} disabled={loading} />

      <TouchableOpacity onPress={() => setView('login')} style={styles.linkRow}>
        <MaterialCommunityIcons name="arrow-left" size={14} color="rgba(255,255,255,0.8)" />
        <Text style={[styles.linkText, { marginLeft: 4 }]}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoginView = () => (
    <View style={styles.formArea}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, view === 'login' && styles.tabActive]} onPress={() => setView('login')}>
          <Text style={[styles.tabText, view === 'login' && styles.tabTextActive]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'register' && styles.tabActive]} onPress={() => setView('register')}>
          <Text style={[styles.tabText, view === 'register' && styles.tabTextActive]}>Register</Text>
        </TouchableOpacity>
      </View>

      <InputField icon="email-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <InputField
        icon="lock-outline"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        right={
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
            <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        }
      />

      <TouchableOpacity onPress={() => setView('forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
        <Text style={[styles.linkText, { fontSize: 12 }]}>Forgot password?</Text>
      </TouchableOpacity>

      <PrimaryButton label="Login" onPress={handleLogin} disabled={loading} />
    </View>
  );

  const renderRegisterView = () => (
    <View style={styles.formArea}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, view === 'login' && styles.tabActive]} onPress={() => setView('login')}>
          <Text style={[styles.tabText, view === 'login' && styles.tabTextActive]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, view === 'register' && styles.tabActive]} onPress={() => setView('register')}>
          <Text style={[styles.tabText, view === 'register' && styles.tabTextActive]}>Register</Text>
        </TouchableOpacity>
      </View>

      <InputField icon="account-outline" placeholder="Full name" value={name} onChangeText={setName} />
      <InputField icon="email-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <InputField
        icon="lock-outline"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        right={
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
            <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        }
      />
      <InputField icon="lock-check-outline" placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <PrimaryButton label="Create Account" onPress={handleRegister} disabled={loading} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['#6c47ff', '#a78bfa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="account-lock" size={36} color="#6c47ff" />
            </View>
            <Text style={styles.title}>
              {view === 'verify-otp' ? 'Check Your Email' :
               view === 'forgot-password' ? 'Forgot Password' :
               'Welcome to MasterAI'}
            </Text>
            {(view === 'login' || view === 'register') && (
              <Text style={styles.subtitle}>
                {customMessage || 'Sign in to unlock AI-powered tools'}
              </Text>
            )}
          </View>

          {/* Form area */}
          {view === 'verify-otp' && renderOtpView()}
          {view === 'forgot-password' && renderForgotView()}
          {view === 'login' && renderLoginView()}
          {view === 'register' && renderRegisterView()}

          {/* Divider + Google — only on login/register views */}
          {(view === 'login' || view === 'register') && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {googleConfigured ? (
                <GoogleSigninButton
                  style={styles.googleBtn}
                  size={GoogleSigninButton.Size.Wide}
                  color={GoogleSigninButton.Color.Light}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                />
              ) : (
                <TouchableOpacity style={styles.googleFallback} onPress={handleGoogleSignIn}>
                  <MaterialCommunityIcons name="google" size={20} color="#6c47ff" />
                  <Text style={styles.googleFallbackText}>Continue with Google</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0eeff' },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    padding: 24,
    elevation: 12,
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 24,
  },

  // Header
  header: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: 'white', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6 },

  // Tabs
  formArea: { width: '100%' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'white' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: '#6c47ff' },

  // Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: 'white', fontSize: 14 },
  eyeBtn: { padding: 4 },

  // Buttons
  primaryBtn: {
    backgroundColor: 'white',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    elevation: 2,
  },
  primaryBtnText: { color: '#6c47ff', fontWeight: '700', fontSize: 16 },

  // Links
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  linkText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  linkBold: { fontWeight: '700', color: 'white' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  dividerText: { color: 'rgba(255,255,255,0.6)', marginHorizontal: 12, fontSize: 12 },

  // Google button
  googleBtn: { width: '100%', height: 48, alignSelf: 'center' },
  googleFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    height: 50,
    gap: 10,
  },
  googleFallbackText: { color: '#6c47ff', fontWeight: '600', fontSize: 15 },

  // OTP/Forgot sub-views
  viewTitle: { fontSize: 18, fontWeight: '700', color: 'white', marginBottom: 6 },
  viewSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 20 },
});

export default SimpleAuthPrompt;
