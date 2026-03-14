import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';

import AllRequestsScreen from '../screens/AdminDashBoardScreen';
import ForgetPasswordScreen from '../screens/ForgetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import MyProductsScreen from '../screens/MyInventoryScreen';
import AddOrderScreen from '../screens/PostItemScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authenticatedUser) => {
      if (authenticatedUser) {
        const role = await AsyncStorage.getItem('userRole');
        setUser(authenticatedUser);
        setUserRole(role);
        console.log("Role from storage:", role);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Group>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="MyProducts" 
            component={MyProductsScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddOrder" 
            component={AddOrderScreen} 
            options={{ headerShown: false }}
          />
           <Stack.Screen 
            name="AllRequests" 
            component={AllRequestsScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ForgetPassword" 
            component={ForgetPasswordScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}