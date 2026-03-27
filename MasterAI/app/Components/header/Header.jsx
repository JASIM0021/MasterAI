import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Poppins_700Bold,
  Poppins_500Medium,
} from '@expo-google-fonts/poppins';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useNavigationHelper from '../../screens/helper/NavigationHelper';

const Header = ({ isHome, title, size, isBack, edgeToEdge = false, statusBarHeight }) => {
  const theme = useTheme();
  const navigate = useNavigationHelper();
  const insets = useSafeAreaInsets();

  let [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Calculate top padding for edge-to-edge mode
  const topPadding = edgeToEdge ? (statusBarHeight || insets.top) : 0;

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.gradientContainer,
        edgeToEdge && { paddingTop: topPadding }
      ]}
    >
      <Appbar.Header
        style={[
          styles.header,
          { justifyContent: isHome || isBack ? 'space-between' : 'flex-start' },
        ]}
      >
        {isBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              navigate.back();
            }}
          >
            <Ionicons
              color={theme.colors.background}
              name="arrow-back"
              size={24}
            />
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: theme.colors.background }]}>
          {title}
        </Text>

        {isHome && (
          <TouchableOpacity onPress={() => {}}>
            <Ionicons
              name="person-circle-outline"
              size={28}
              color={theme.colors.background}
            />
          </TouchableOpacity>
        )}
      </Appbar.Header>
    </LinearGradient>
  );
};

export default Header;

const styles = StyleSheet.create({
  gradientContainer: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,

    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  backButton: {
    marginLeft: 10,
    padding: 8,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
