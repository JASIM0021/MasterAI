/**
 * Layout Components Export
 *
 * Centralized exports for all layout-related components providing
 * consistent safe area handling and edge-to-edge support.
 */

// Main components
export { default as SafeScreen } from './SafeScreen';
export {
  default as ScreenContainer,
  ScrollableScreen,
  EdgeToEdgeScreen,
  MinimalScreen,
  FullScreen
} from './ScreenContainer';

// Re-export useful hooks from react-native-safe-area-context for convenience
export {
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaProvider,
  SafeAreaView
} from 'react-native-safe-area-context';

/**
 * Usage Examples:
 *
 * Basic screen with safe area:
 * import { SafeScreen } from '../Components/layout';
 * <SafeScreen>
 *   <YourContent />
 * </SafeScreen>
 *
 * Complete screen with header and scrolling:
 * import { ScrollableScreen } from '../Components/layout';
 * <ScrollableScreen header={<Header title="My Screen" />}>
 *   <YourContent />
 * </ScrollableScreen>
 *
 * Edge-to-edge screen:
 * import { EdgeToEdgeScreen } from '../Components/layout';
 * <EdgeToEdgeScreen>
 *   <AppBar />
 *   <YourContent />
 * </EdgeToEdgeScreen>
 *
 * Custom configuration:
 * import { ScreenContainer } from '../Components/layout';
 * <ScreenContainer
 *   scroll
 *   edgeToEdge
 *   safeAreaEdges={['bottom']}
 *   loading={isLoading}
 * >
 *   <YourContent />
 * </ScreenContainer>
 */