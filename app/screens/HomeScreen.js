import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import Profile from './ProfileScreen';
import Discussions from './UserListScreen';
import GroupsScreen from './GroupsScreen'; 
import { auth, db } from '../../firebase/config';
import { ref, update } from "firebase/database";

const Tab = createBottomTabNavigator();

export default function HomeScreen({ navigation }) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.reset({ routes: [{ name: 'Login' }] });
      return;
    }

    const userRef = ref(db, `users/${auth.currentUser.uid}`);

    const setUserActive = async () => {
      try {
        await update(userRef, { isActive: true });
        setIsActive(true);
      } catch (error) {
        console.error("Error updating isActive: ", error);
      }
    };

    setUserActive();

    return () => {
      if (auth.currentUser) {
        update(userRef, { isActive: false }).catch((error) =>
          console.error("Error updating isActive on unmount: ", error)
        );
      }
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Discussions') iconName = 'chatbubbles-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          else if (route.name === 'Groups') iconName = 'people-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#388E3C',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#E8F5E9' },
      })}
    >
      <Tab.Screen name="Discussions" component={Discussions} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}
