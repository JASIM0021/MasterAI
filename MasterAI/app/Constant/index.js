// Optimized index.js with lazy loading for better performance
// All screen components are now loaded on-demand instead of at app startup

// Import lazy components instead of direct imports
import {
  LazyAdTestScreen,
  LazyAgeAnalizer,
  LazyAgeDetailsScreen,
  LazyAnalizeDetailView,
  LazyAnalyzeUserFeelings,
  LazyAnimalAnalizer,
  LazyQuestionAnswerList,
  LazyLoginFB,
  LazyCreateCaption,
  LazyCaptionDetailsList,
  LazyContentBlocker,
  LazyAIMathSolver,
  LazyAIMathSolverDetails,
  LazyGuardianScreen,
  LazyAIImageEdits,
  LazyAIImageGeneration,
  LazyAIPhotoEdit,
  LazyTraditionalPhotoEdit,
  LazyPostCreation,
  LazyPostDetailsList,
  LazyToolList,
  LazyTreeAnalize,
  LazyTreeDetailsScreen,
  LazyUploadPhoto,
  LazyUploadVideo,
  LazyWebViewTools,
  LazyUserProfile,
  LazySocialAutomate,
  LazyAIImageEditScreen,
  LazyCreditPurchaseScreen,
  LazyVideoGenerationScreen,
  LazyVideoCustomPromptScreen,
  LazyTemplateSelectionScreen,
  LazyMyVideosScreen,
  LazyVideoFavoritesScreen,
  LazyAuthScreen,
  // Add other lazy components as needed
} from './lazyComponents';

// Import screen names from separate file to avoid circular dependencies
export { SCREEN_NAME, appConstant } from './screenNames';

// Screen component mapping using lazy-loaded components
// This significantly reduces initial bundle size and improves startup performance
export const SCREEN_COMPONENT = {
  UploadPhoto: LazyUploadPhoto,
  QuestionAnswerList: LazyQuestionAnswerList,
  AdTestScreen: LazyAdTestScreen,
  UploadVideo: LazyUploadVideo,
  ToolList: LazyToolList,
  CreateCaption: LazyCreateCaption,
  CaptionDetailsList: LazyCaptionDetailsList,
  PostCreation: LazyPostCreation,
  PostDetailsList: LazyPostDetailsList,
  AnalyzeUserFeelings: LazyAnalyzeUserFeelings,
  AnalyzeUserFeelingsDetailView: LazyAnalizeDetailView,
  TreeAnalize: LazyTreeAnalize,
  AIPhotoEdit: LazyAIPhotoEdit,
  TraditionalPhotoEdit: LazyTraditionalPhotoEdit,
  AgeAnalizer: LazyAgeAnalizer,
  AgeDetailsScreen: LazyAgeDetailsScreen,
  TreeDetailsScreen: LazyTreeDetailsScreen,
  AnimalAnalizer: LazyAnimalAnalizer,
  AIImageGeneration: LazyAIImageGeneration,
  AIMathSolver: LazyAIMathSolver,
  AIMathSolverDetails: LazyAIMathSolverDetails,
  LoginFB: LazyLoginFB,
  SocialAutomate: LazySocialAutomate,
  VirtualClothTest: LazyWebViewTools,
  ContentBlocker: LazyContentBlocker,
  GuardianScreen: LazyGuardianScreen,
  AIImageEdits: LazyAIImageEdits,
  UserProfile: LazyUserProfile,
  AIImageEditScreen: LazyAIImageEditScreen,
  CreditPurchase: LazyCreditPurchaseScreen,
  VideoGeneration: LazyVideoGenerationScreen,
  VideoCustomPrompt: LazyVideoCustomPromptScreen,
  TemplateSelection: LazyTemplateSelectionScreen,
  MyVideos: LazyMyVideosScreen,
  VideoFavorites: LazyVideoFavoritesScreen,
  AuthScreen: LazyAuthScreen
};

if (__DEV__) {
  console.log('🚀 Screen components loaded with lazy loading for improved performance');
}