// ============ HomeScreen.js ============
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProfileScreen from './ProfileScreen'; // Note: Changed from Profile to ProfileScreen
import UserListScreen from './UserListScreen'; // Note: Changed from Discussions to UserListScreen
import GroupsScreen from './GroupsScreen'; 
import { auth } from '../../firebase/config';

export default function HomeScreen(props) {
  const Tab = createBottomTabNavigator();
  const currentId = props.route?.params?.currentId || auth.currentUser?.uid;

  console.log("HomeScreen - currentId:", currentId); // Debug log

  return (
    <Tab.Navigator
      initialRouteName="UserListScreen"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#25D366",
        tabBarInactiveTintColor: "#8898AA",
        tabBarStyle: {
          backgroundColor: "#0B141A",
          borderTopColor: "#2E3A3F",
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          color: '#FFFFFF',
        },
      }}
    >
      <Tab.Screen
        name="UserListScreen"
        component={UserListScreen}
        initialParams={{ currentId }} 
        options={{
          tabBarLabel: "Discussions",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="message-text"
              color={color}
              size={size || 24}
            />
          ),
        }}
      />     
      
      <Tab.Screen
        name="GroupsScreen"
        component={GroupsScreen}
        initialParams={{ currentId }}
        options={{
          tabBarLabel: "Groups",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group" // CORRIGÉ : Icône correcte pour les groupes
              color={color}
              size={size || 24}
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        initialParams={{ currentId }} 
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons 
              name="account-circle" 
              color={color} 
              size={size || 24}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}