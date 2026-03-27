import React from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { ActivityIndicator, Portal, Modal, Text } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import SafeScreen from './SafeScreen';

/**
 * ScreenContainer - Complete screen wrapper with common patterns
 *
 * Features:
 * - Built on SafeScreen for consistent safe area handling
 * - Header support (custom header component or title)
 * - Loading state overlay
 * - Keyboard avoidance
 * - Error boundary support
 * - Theme integration
 * - Modal overlay support
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Screen content
 * @param {React.ReactNode} props.header - Custom header component
 * @param {string} props.title - Screen title (used with default header)
 * @param {boolean} props.loading - Show loading overlay
 * @param {string} props.loadingText - Loading message
 * @param {boolean} props.scroll - Enable ScrollView
 * @param {boolean} props.keyboardAvoiding - Enable keyboard avoidance
 * @param {Array} props.safeAreaEdges - Safe area edges to apply
 * @param {boolean} props.edgeToEdge - Enable edge-to-edge mode
 * @param {string} props.backgroundColor - Background color
 * @param {Object} props.style - Container styles
 * @param {Object} props.contentStyle - Content area styles
 * @param {Function} props.onRefresh - Pull to refresh handler (requires scroll=true)
 * @param {boolean} props.refreshing - Pull to refresh state
 */
const ScreenContainer = ({
  children,
  header,
  title,
  loading = false,
  loadingText = 'Loading...',
  scroll = false,
  keyboardAvoiding = true,
  safeAreaEdges = ['top', 'bottom', 'left', 'right'],
  edgeToEdge = false,
  backgroundColor,
  style,
  contentStyle,
  onRefresh,
  refreshing = false,
  ...safeScreenProps
}) => {
  const theme = useTheme();

  // Keyboard avoiding view configuration
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const keyboardAvoidingViewProps = keyboardAvoiding ? {
    behavior: keyboardBehavior,
    keyboardVerticalOffset: Platform.OS === 'ios' ? 0 : 25,
  } : {};

  // Loading overlay component
  const LoadingOverlay = () => (
    <Portal>
      <Modal
        visible={loading}
        dismissable={false}
        contentContainerStyle={[
          styles.loadingModal,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {loadingText && (
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            {loadingText}
          </Text>
        )}
      </Modal>
    </Portal>
  );

  // Content wrapper with keyboard avoidance
  const ContentWrapper = ({ children }) => {
    if (keyboardAvoiding) {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          {...keyboardAvoidingViewProps}
        >
          {children}
        </KeyboardAvoidingView>
      );
    }
    return children;
  };

  // Refresh control for ScrollView
  const refreshControlProps = onRefresh && scroll ? {
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[theme.colors.primary]}
        tintColor={theme.colors.primary}
      />
    ),
  } : {};

  return (
    <>
      <SafeScreen
        edges={safeAreaEdges}
        edgeToEdge={edgeToEdge}
        scroll={scroll}
        backgroundColor={backgroundColor}
        style={[styles.container, style]}
        contentContainerStyle={contentStyle}
        {...refreshControlProps}
        {...safeScreenProps}
      >
        <ContentWrapper>
          {header}
          {children}
        </ContentWrapper>
      </SafeScreen>

      {loading && <LoadingOverlay />}
    </>
  );
};

// Common screen container variants for quick usage
export const ScrollableScreen = (props) => (
  <ScreenContainer scroll={true} {...props} />
);

export const EdgeToEdgeScreen = (props) => (
  <ScreenContainer edgeToEdge={true} {...props} />
);

export const MinimalScreen = (props) => (
  <ScreenContainer
    safeAreaEdges={['bottom']}
    keyboardAvoiding={false}
    {...props}
  />
);

export const FullScreen = (props) => (
  <ScreenContainer
    safeAreaEdges={[]}
    edgeToEdge={true}
    keyboardAvoiding={false}
    {...props}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingModal: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    margin: 50,
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ScreenContainer;