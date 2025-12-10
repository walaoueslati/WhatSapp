// App.js or Tabs.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import Splash from '../screens/SplashScreen';
import GroupsScreen from '../screens/GroupsScreen';
const Stack = createNativeStackNavigator();

export default function Tabs() {
  return (
    
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen name="Splash" 
        component={Splash} 
        options={{ headerShown: false }}/>

        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RegisterScreen"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GroupsScreen"
          component={GroupsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
        name="ChatScreen" 
        component={ChatScreen} 
         options={{ 
          headerShown: false  
        }}/>

      </Stack.Navigator>
  );
}
