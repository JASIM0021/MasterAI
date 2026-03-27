import React, { Suspense } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Loading component for lazy imports
const LazyLoadingComponent = ({ name }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Loading {name}...</Text>
  </View>
);

// Higher-order component to wrap lazy components with Suspense
const withLazyLoading = (LazyComponent, name) => {
  return React.forwardRef((props, ref) => (
    <Suspense fallback={<LazyLoadingComponent name={name} />}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));
};

// Lazy imports for screens that actually exist in the original project
const AdTestScreen = React.lazy(() => import('../screens/Ads/AdTestScreen'));
const AgeAnalizer = React.lazy(() => import('../screens/Age/AgeAnalizer'));
const AgeDetailsScreen = React.lazy(() => import('../screens/Age/AgeDetailsScreen'));
const AnalizeDetailView = React.lazy(() => import('../screens/AnalyzeUserFeelings/AnalizeDetailView'));
const AnalyzeUserFeelings = React.lazy(() => import('../screens/AnalyzeUserFeelings/AnalyzeUserFeelings'));
const AnimalAnalizer = React.lazy(() => import('../screens/Animal/AnimalAnilizer'));
const QuestionAnswerList = React.lazy(() => import('../screens/answerList/AnswerList'));
const LoginFB = React.lazy(() => import('../screens/Auth/LoginFB/LoginFB'));

// Import protected versions of generation screens
const CreateCaption = React.lazy(() => import('../screens/caption/CaptionProtected'));
const CaptionDetailsList = React.lazy(() => import('../screens/caption/CaptionDetailsList'));
const ContentBlocker = React.lazy(() => import('../screens/ContentBlocker/ContentBlocker'));
const AIMathSolver = React.lazy(() => import('../screens/education/AIMathSolver'));
const AIMathSolverDetails = React.lazy(() => import('../screens/education/AIMathSolverDetails'));
const GuardianScreen = React.lazy(() => import('../screens/Guardian/GuardianScreen'));
const AIImageEdits = React.lazy(() => import('../screens/photo/AiImageEditsProtected'));
const AIImageGeneration = React.lazy(() => import('../screens/photo/AIImageGenerationProtected'));
const AIPhotoEdit = React.lazy(() => import('../screens/photo/AIPhotoEdit'));
const TraditionalPhotoEdit = React.lazy(() => import('../screens/photo/TraditionalPhotoEdit'));
const PostCreation = React.lazy(() => import('../screens/Post/PostCreationProtected'));
const PostDetailsList = React.lazy(() => import('../screens/Post/PostDetailsList'));
const ToolList = React.lazy(() => import('../screens/ToolList/ToolList'));
const TreeAnalize = React.lazy(() => import('../screens/tree/TreeAnalize'));
const TreeDetailsScreen = React.lazy(() => import('../screens/tree/TreeDetailsScreen'));

const UploadPhoto = React.lazy(() => import('../screens/upload/Upload'));
const UploadVideo = React.lazy(() => import('../screens/upload/UploadVidei'));
const WebViewTools = React.lazy(() => import('../screens/WebViewTools/WebViewTools'));
const UserProfile = React.lazy(() => import('../screens/Profile/UserProfile'));
const SocialAutomate = React.lazy(() => import('../screens/SocialAutomate/SocialAutomate'));

// Additional video and other screens that actually exist
const AIImageEditScreen = React.lazy(() => import('../screens/AIImageEdit/AIImageEditScreen'));
const CreditPurchaseScreen = React.lazy(() => import('../screens/CreditPurchase/CreditPurchaseScreen'));
const VideoGenerationScreen = React.lazy(() => import('../screens/VideoGeneration/VideoGenerationScreen'));
const VideoCustomPromptScreen = React.lazy(() => import('../screens/VideoGeneration/VideoCustomPromptScreen'));
const TemplateSelectionScreen = React.lazy(() => import('../screens/VideoGeneration/TemplateSelectionScreen'));
const MyVideosScreen = React.lazy(() => import('../screens/VideoGeneration/MyVideosScreen'));
const VideoFavoritesScreen = React.lazy(() => import('../screens/VideoGeneration/VideoFavoritesScreen'));
const AuthScreen = React.lazy(() => import('../screens/Auth/AuthScreen'));

// Wrapped components with Suspense - only for screens that exist
export const LazyAdTestScreen = withLazyLoading(AdTestScreen, 'Ad Test');
export const LazyAgeAnalizer = withLazyLoading(AgeAnalizer, 'Age Analyzer');
export const LazyAgeDetailsScreen = withLazyLoading(AgeDetailsScreen, 'Age Details');
export const LazyAnalizeDetailView = withLazyLoading(AnalizeDetailView, 'Analysis Details');
export const LazyAnalyzeUserFeelings = withLazyLoading(AnalyzeUserFeelings, 'Feelings Analysis');
export const LazyAnimalAnalizer = withLazyLoading(AnimalAnalizer, 'Animal Analyzer');
export const LazyQuestionAnswerList = withLazyLoading(QuestionAnswerList, 'Q&A List');
export const LazyLoginFB = withLazyLoading(LoginFB, 'Login');

export const LazyCreateCaption = withLazyLoading(CreateCaption, 'Caption Creator');
export const LazyCaptionDetailsList = withLazyLoading(CaptionDetailsList, 'Caption Details');
export const LazyContentBlocker = withLazyLoading(ContentBlocker, 'Content Blocker');
export const LazyAIMathSolver = withLazyLoading(AIMathSolver, 'Math Solver');
export const LazyAIMathSolverDetails = withLazyLoading(AIMathSolverDetails, 'Math Details');
export const LazyGuardianScreen = withLazyLoading(GuardianScreen, 'Guardian');
export const LazyAIImageEdits = withLazyLoading(AIImageEdits, 'Image Editor');
export const LazyAIImageGeneration = withLazyLoading(AIImageGeneration, 'Image Generator');
export const LazyAIPhotoEdit = withLazyLoading(AIPhotoEdit, 'Photo Editor');
export const LazyTraditionalPhotoEdit = withLazyLoading(TraditionalPhotoEdit, 'Photo Editor');
export const LazyPostCreation = withLazyLoading(PostCreation, 'Post Creator');
export const LazyPostDetailsList = withLazyLoading(PostDetailsList, 'Post Details');
export const LazyToolList = withLazyLoading(ToolList, 'Tools');
export const LazyTreeAnalize = withLazyLoading(TreeAnalize, 'Tree Analyzer');
export const LazyTreeDetailsScreen = withLazyLoading(TreeDetailsScreen, 'Tree Details');

export const LazyUploadPhoto = withLazyLoading(UploadPhoto, 'Upload Photo');
export const LazyUploadVideo = withLazyLoading(UploadVideo, 'Upload Video');
export const LazyWebViewTools = withLazyLoading(WebViewTools, 'Web Tools');
export const LazyUserProfile = withLazyLoading(UserProfile, 'Profile');
export const LazySocialAutomate = withLazyLoading(SocialAutomate, 'Social Automation');

// Additional screen exports
export const LazyAIImageEditScreen = withLazyLoading(AIImageEditScreen, 'Image Editor');
export const LazyCreditPurchaseScreen = withLazyLoading(CreditPurchaseScreen, 'Credit Purchase');
export const LazyVideoGenerationScreen = withLazyLoading(VideoGenerationScreen, 'Video Generator');
export const LazyVideoCustomPromptScreen = withLazyLoading(VideoCustomPromptScreen, 'Video Prompt');
export const LazyTemplateSelectionScreen = withLazyLoading(TemplateSelectionScreen, 'Template Selection');
export const LazyMyVideosScreen = withLazyLoading(MyVideosScreen, 'My Videos');
export const LazyVideoFavoritesScreen = withLazyLoading(VideoFavoritesScreen, 'Video Favorites');
export const LazyAuthScreen = withLazyLoading(AuthScreen, 'Authentication');

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});