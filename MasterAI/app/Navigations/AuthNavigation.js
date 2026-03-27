import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SCREEN_COMPONENT, SCREEN_NAME } from '../Constant';
import { StatusBar } from 'expo-status-bar';

const screen = [
  // {
  //   name: SCREEN_NAME.LoginFB,
  //   component: SCREEN_COMPONENT.LoginFB,
  // },
  {
    name: SCREEN_NAME.HomeTab,
    component: SCREEN_COMPONENT.ToolList,
  },
  {
    name: SCREEN_NAME.UploadPhoto,
    component: SCREEN_COMPONENT.UploadPhoto,
  },
  {
    name: SCREEN_NAME.QuestionAnswerList,
    component: SCREEN_COMPONENT.QuestionAnswerList,
  },

  {
    name: SCREEN_NAME.AdTestScreen,
    component: SCREEN_COMPONENT.AdTestScreen,
  },
  {
    name: SCREEN_NAME.UploadVideo,
    component: SCREEN_COMPONENT.UploadVideo,
  },
  {
    name: SCREEN_NAME.ToolList,
    component: SCREEN_COMPONENT.ToolList,
  },
  {
    name: SCREEN_NAME.CreateCaption,
    component: SCREEN_COMPONENT.CreateCaption,
  },
  {
    name: SCREEN_NAME.CaptionDetailsList,
    component: SCREEN_COMPONENT.CaptionDetailsList,
  },
  {
    name: SCREEN_NAME.PostCreation,
    component: SCREEN_COMPONENT.PostCreation,
  },
  {
    name: SCREEN_NAME.PostDetailsList,
    component: SCREEN_COMPONENT.PostDetailsList,
  },
  {
    name: SCREEN_NAME.AnalyzeUserFeelings,
    component: SCREEN_COMPONENT.AnalyzeUserFeelings,
  },
  {
    name: SCREEN_NAME.AnalyzeUserFeelingsDetailView,
    component: SCREEN_COMPONENT.AnalyzeUserFeelingsDetailView,
  },
  {
    name: SCREEN_NAME.TreeAnalize,
    component: SCREEN_COMPONENT.TreeAnalize,
  },
  {
    name: SCREEN_NAME.AIPhotoEdit,
    component: SCREEN_COMPONENT.AIPhotoEdit,
  },
  {
    name: SCREEN_NAME.TraditionalPhotoEdit,
    component: SCREEN_COMPONENT.TraditionalPhotoEdit,
  },
  {
    name: SCREEN_NAME.AgeAnalizer,
    component: SCREEN_COMPONENT.AgeAnalizer,
  },
  {
    name: SCREEN_NAME.AgeDetailsScreen,
    component: SCREEN_COMPONENT.AgeDetailsScreen,
  },
  {
    name: SCREEN_NAME.TreeDetailsScreen,
    component: SCREEN_COMPONENT.TreeDetailsScreen,
  },
  {
    name: SCREEN_NAME.AnimalAnalizer,
    component: SCREEN_COMPONENT.AnimalAnalizer,
  },
  {
    name: SCREEN_NAME.AIImageGeneration,
    component: SCREEN_COMPONENT.AIImageGeneration,
  },
  {
    name: SCREEN_NAME.AIMathSolver,
    component: SCREEN_COMPONENT.AIMathSolver,
  },
  {
    name: SCREEN_NAME.AIMathSolverDetails,
    component: SCREEN_COMPONENT.AIMathSolverDetails,
  },
  {
    name: SCREEN_NAME.SocialAutomate,
    component: SCREEN_COMPONENT.SocialAutomate,
  },
  {
    name: SCREEN_NAME.VirtualClothTest,
    component: SCREEN_COMPONENT.VirtualClothTest,
  },
  {
    name: SCREEN_NAME.ContentBlocker,
    component: SCREEN_COMPONENT.ContentBlocker,
  },
  {
    name: SCREEN_NAME.GuardianScreen,
    component: SCREEN_COMPONENT.GuardianScreen,
  },
  {
    name: SCREEN_NAME.AIImageEdits,
    component: SCREEN_COMPONENT.AIImageEdits,
  },
  {
    name: SCREEN_NAME.AIImageEditScreen,
    component: SCREEN_COMPONENT.AIImageEditScreen,
  },
  {
    name: SCREEN_NAME.CreditPurchase,
    component: SCREEN_COMPONENT.CreditPurchase,
  },
  {
    name: SCREEN_NAME.VideoGeneration,
    component: SCREEN_COMPONENT.VideoGeneration,
  },
  {
    name: SCREEN_NAME.VideoCustomPrompt,
    component: SCREEN_COMPONENT.VideoCustomPrompt,
  },
  {
    name: SCREEN_NAME.TemplateSelection,
    component: SCREEN_COMPONENT.TemplateSelection,
  },
  {
    name: SCREEN_NAME.VideoFavorites,
    component: SCREEN_COMPONENT.VideoFavorites,
  },
  {
    name: SCREEN_NAME.AuthScreen,
    component: SCREEN_COMPONENT.AuthScreen
  },
  {
    name: SCREEN_NAME.MyVideos,
    component: SCREEN_COMPONENT.MyVideos
  }
];

const AuthNavigation = ({ route }) => {
  const Stack = createNativeStackNavigator();
  return (
    <>
      <StatusBar hidden={true} />
      <Stack.Navigator
        initialRouteName={SCREEN_NAME.HomeTab}
        screenOptions={{
          headerShown: false,
          headerSearchBarOptions: {
            cancelButtonText: 'Cancel',
          },
        }}
      >
        {screen.map((sc, index) => {
          return (
            <Stack.Screen
              name={sc.name}
              component={sc.component}
              key={sc.name}
            />
          );
        })}
      </Stack.Navigator>
    </>
  );
};

export default AuthNavigation;
