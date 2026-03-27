import React from 'react';
import SocialAutomate from '../screens/SocialAutomate/SocialAutomate';
import CreateAutomation from '../screens/SocialAutomate/CreateAutomation';
import EditAutomation from '../screens/SocialAutomate/EditAutomation';
import SchedulesList from '../screens/SocialAutomate/SchedulesList';
import ScheduleDetails from '../screens/SocialAutomate/ScheduleDetails';
import PostsList from '../screens/Post/PostsList';
import ApprovePost from '../screens/Post/ApprovePost';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const SocialAutomateNavigation = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="SocialAutomateMain"
        component={SocialAutomate}
      />
      <Stack.Screen
        name="CreateAutomation"
        component={CreateAutomation}
        options={{
          headerShown: true,
          title: 'Create Automation',
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="EditAutomation"
        component={EditAutomation}
        options={{
          headerShown: true,
          title: 'Edit Automation',
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="SchedulesList"
        component={SchedulesList}
        // options={{
        //   headerShown: true,
        //   title: 'Your Automations',
        //   headerStyle: {
        //     backgroundColor: '#6200ee',
        //   },
          // headerTintColor: '#fff',
          // headerTitleStyle: {
          //   fontWeight: 'bold',
          // },
        // }}
      />
      <Stack.Screen
        name="ScheduleDetails"
        component={ScheduleDetails}
        // options={{
        //   headerShown: true,
        //   title: 'Automation Details',
        //   headerStyle: {
        //     backgroundColor: '#6200ee',
        //   },
        //   headerTintColor: '#fff',
        //   headerTitleStyle: {
        //     fontWeight: 'bold',
        //   },
        // }}
      />
      <Stack.Screen
        name="PostsList"
        component={PostsList}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ApprovePost"
        component={ApprovePost}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default SocialAutomateNavigation;