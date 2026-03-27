import React from 'react';
import { StyleSheet, ScrollView, View, StatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

/**
 * SafeScreen - A flexible SafeAreaView wrapper with edge-to-edge support
 *
 * Features:
 * - Uses SafeAreaView from react-native-safe-area-context
 * - Supports selective edge insets (top, bottom, left, right)
 * - Optional edge-to-edge mode for modern UI
 * - Theme-aware background colors
 * - ScrollView integration
 * - Keyboard avoidance support
 *
 * @param {Object} props
 * @param {Array} props.edges - Array of edges to apply safe area ['top', 'bottom', 'left', 'right']
 * @param {boolean} props.edgeToEdge - Enable edge-to-edge mode (extends behind system UI)
 * @param {boolean} props.scroll - Enable ScrollView wrapper
 * @param {string} props.backgroundColor - Custom background color (overrides theme)
 * @param {Object} props.style - Additional styles for the container
 * @param {Object} props.contentContainerStyle - Styles for ScrollView content container
 * @param {boolean} props.keyboardAvoidingView - Enable KeyboardAvoidingView wrapper
 * @param {string} props.statusBarStyle - StatusBar style: 'default' | 'light-content' | 'dark-content'
 * @param {boolean} props.statusBarTranslucent - Make StatusBar translucent (Android)
 * @param {React.ReactNode} props.children - Child components
 */
const SafeScreen = ({
  edges = ['top', 'bottom', 'left', 'right'],
  edgeToEdge = false,
  scroll = false,
  backgroundColor,
  style,
  contentContainerStyle,
  keyboardAvoidingView = false,
  statusBarStyle,
  statusBarTranslucent,
  children,
  ...rest
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Determine which edges to apply based on edgeToEdge mode
  const safeAreaEdges = edgeToEdge ? [] : edges;

  // Calculate manual padding for edge-to-edge mode
  const edgeToEdgePadding = edgeToEdge ? {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  } : {};

  // Determine background color
  const screenBackgroundColor = backgroundColor || theme.colors.surface;

  // StatusBar configuration
  const shouldConfigureStatusBar = statusBarStyle !== undefined || statusBarTranslucent !== undefined;

  const statusBarConfig = shouldConfigureStatusBar ? {
    barStyle: statusBarStyle || (theme.dark ? 'light-content' : 'dark-content'),
    backgroundColor: edgeToEdge ? 'transparent' : screenBackgroundColor,
    translucent: statusBarTranslucent !== undefined ? statusBarTranslucent : edgeToEdge,
  } : null;

  // Container styles
  const containerStyle = [
    styles.container,
    {
      backgroundColor: screenBackgroundColor,
    },
    edgeToEdge && edgeToEdgePadding,
    style,
  ];

  // Content wrapper component
  const ContentWrapper = scroll ? ScrollView : View;
  const contentProps = scroll ? {
    contentContainerStyle: [
      scroll && styles.scrollContent,
      contentContainerStyle,
    ],
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled',
  } : {};

  return (
    <>
      {statusBarConfig && (
        <StatusBar
          barStyle={statusBarConfig.barStyle}
          backgroundColor={statusBarConfig.backgroundColor}
          translucent={statusBarConfig.translucent}
        />
      )}
      <SafeAreaView
        edges={safeAreaEdges}
        style={containerStyle}
        {...rest}
      >
        <ContentWrapper
          style={scroll ? undefined : styles.content}
          {...contentProps}
        >
          {children}
        </ContentWrapper>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default SafeScreen;