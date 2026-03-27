import { DefaultTheme } from 'react-native-paper';
import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1E40AF', // Deep Electric Blue - Trust and intelligence
    accent: '#8B5CF6', // Electric Purple - AI magic and creativity
    secondary: '#06B6D4', // Vibrant Cyan - Innovation and technology
    success: '#10B981', // Emerald Green - Positive results
    warning: '#F59E0B', // Bright Orange - Energy and attention
    background: '#F8FAFC', // Ultra-light Blue-Gray
    surface: '#FFFFFF', // Pure White
    text: '#0F172A', // Dark Slate
    textSecondary: '#475569', // Medium Slate
    placeholder: '#94A3B8', // Light Slate for placeholders
    border: '#E2E8F0', // Very Light Slate
    card: '#FFFFFF', // White cards

    // Enhanced gradient colors for modern UI
    gradientPrimary: ['#667eea', '#764ba2'],
    gradientSecondary: ['#4facfe', '#00f2fe'],
    gradientAccent: ['#f093fb', '#f5576c'],
    gradientSuccess: ['#43e97b', '#38f9d7'],
    gradientWarning: ['#ffecd2', '#fcb69f'],

    // Category specific gradients
    newGradient: ['#FF6B6B', '#4ECDC4'],
    imageGradient: ['#667eea', '#764ba2'],
    socialGradient: ['#f093fb', '#f5576c'],
    educationGradient: ['#43e97b', '#38f9d7'],
    analysisGradient: ['#4facfe', '#00f2fe'],
    writingGradient: ['#a8edea', '#fed6e3'],
    codingGradient: ['#ffecd2', '#fcb69f'],
    designGradient: ['#ff9a9e', '#fecfef'],
  },
};

export const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3B82F6', // Bright Electric Blue - Vibrant trust
    accent: '#A855F7', // Vivid Purple - Enhanced AI magic
    secondary: '#22D3EE', // Bright Cyan - Tech innovation
    success: '#22C55E', // Bright Green - Clear success
    warning: '#FB923C', // Bright Orange - Attention grabbing
    background: '#0F172A', // Dark Slate - Deep tech background
    surface: '#1E293B', // Medium Dark Slate - Card surfaces
    text: '#F1F5F9', // Almost White - High contrast text
    textSecondary: '#CBD5E1', // Light Slate - Secondary text
    placeholder: '#64748B', // Medium Slate for placeholders
    border: '#334155', // Dark Medium Slate borders
    card: '#1E293B', // Dark cards matching surface

    // Enhanced gradient colors for dark theme
    gradientPrimary: ['#3B82F6', '#1E40AF'],
    gradientSecondary: ['#22D3EE', '#0891B2'],
    gradientAccent: ['#A855F7', '#7C3AED'],
    gradientSuccess: ['#22C55E', '#16A34A'],
    gradientWarning: ['#FB923C', '#EA580C'],

    // Category specific gradients (darker variants)
    newGradient: ['#EF4444', '#06B6D4'],
    imageGradient: ['#3B82F6', '#6366F1'],
    socialGradient: ['#EC4899', '#8B5CF6'],
    educationGradient: ['#10B981', '#059669'],
    analysisGradient: ['#0EA5E9', '#0284C7'],
    writingGradient: ['#6EE7B7', '#FDE68A'],
    codingGradient: ['#FDE047', '#FB7185'],
    designGradient: ['#F472B6', '#C084FC'],
  },
};

// Responsive dimensions
export const responsiveWidth = width * 0.25; // 25% of screen width
export const responsiveHeight = height * 0.1; // 10% of screen height

// Enhanced responsive utilities
export const deviceWidth = width;
export const deviceHeight = height;

// Screen size helpers
export const isSmallScreen = width < 350;
export const isMediumScreen = width >= 350 && width < 450;
export const isLargeScreen = width >= 450;

// Spacing utilities
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius utilities
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 50,
};

// Shadow presets
export const shadows = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};

// Animation durations
export const animations = {
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

// Safe area utilities for edge-to-edge support
export const safeArea = {
  // Common edge configurations
  edges: {
    all: ['top', 'bottom', 'left', 'right'],
    vertical: ['top', 'bottom'],
    horizontal: ['left', 'right'],
    topOnly: ['top'],
    bottomOnly: ['bottom'],
    exceptTop: ['bottom', 'left', 'right'],
    exceptBottom: ['top', 'left', 'right'],
  },

  // StatusBar height constants
  statusBarHeight: Platform.select({
    ios: 44, // Standard iOS status bar height
    android: StatusBar.currentHeight || 24, // Dynamic Android status bar height
    default: 24,
  }),

  // Common padding values for manual safe area handling
  padding: {
    top: Platform.select({
      ios: 44,
      android: StatusBar.currentHeight || 24,
      default: 24,
    }),
    bottom: Platform.select({
      ios: 34, // iPhone X+ home indicator
      android: 0,
      default: 0,
    }),
    horizontal: 0,
  },

  // Edge-to-edge overlay colors (for status bar backgrounds)
  overlayColors: {
    light: 'rgba(248, 250, 252, 0.95)', // Light theme overlay
    dark: 'rgba(15, 23, 42, 0.95)', // Dark theme overlay
    transparent: 'transparent',
    primary: 'rgba(30, 64, 175, 0.95)', // Primary color overlay
    accent: 'rgba(139, 92, 246, 0.95)', // Accent color overlay
  },

  // Common screen types for quick configuration
  screenTypes: {
    // Standard screen with all safe areas
    standard: {
      edges: ['top', 'bottom', 'left', 'right'],
      edgeToEdge: false,
    },

    // Edge-to-edge with manual top padding (for custom headers)
    edgeToEdgeWithHeader: {
      edges: ['left', 'right'],
      edgeToEdge: true,
    },

    // Full screen (like media viewers)
    fullScreen: {
      edges: [],
      edgeToEdge: true,
    },

    // Modal style (all edges except top)
    modal: {
      edges: ['bottom', 'left', 'right'],
      edgeToEdge: false,
    },

    // Bottom sheet style (only bottom edge)
    bottomSheet: {
      edges: ['bottom'],
      edgeToEdge: false,
    },
  },
};

// Helper functions for safe area calculations
export const safeAreaHelpers = {
  // Get safe area padding for a specific configuration
  getPadding: (insets, edges = safeArea.edges.all) => ({
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }),

  // Get margin values for safe area
  getMargin: (insets, edges = safeArea.edges.all) => ({
    marginTop: edges.includes('top') ? insets.top : 0,
    marginBottom: edges.includes('bottom') ? insets.bottom : 0,
    marginLeft: edges.includes('left') ? insets.left : 0,
    marginRight: edges.includes('right') ? insets.right : 0,
  }),

  // Check if device has notch or dynamic island
  hasNotch: (insets) => insets.top > safeArea.statusBarHeight,

  // Check if device has home indicator
  hasHomeIndicator: (insets) => insets.bottom > 0,

  // Get total safe area height (top + bottom)
  getTotalSafeAreaHeight: (insets) => insets.top + insets.bottom,

  // Get content height accounting for safe areas
  getContentHeight: (insets, edges = safeArea.edges.all) => {
    const topOffset = edges.includes('top') ? insets.top : 0;
    const bottomOffset = edges.includes('bottom') ? insets.bottom : 0;
    return height - topOffset - bottomOffset;
  },
};
