// navigation/AppNavigator.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AllRequestsScreen from '../screens/AdminDashBoardScreen';
import ForgetPasswordScreen from '../screens/ForgetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import MyProductsScreen from '../screens/MyInventoryScreen';
import AddOrderScreen from '../screens/PostItemScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} />
    <Stack.Screen 
    name="Home" 
    component={HomeScreen} 
    options={{ headerShown: false }} 
/>
 <Stack.Screen name="MyProducts" component={MyProductsScreen} />
      <Stack.Screen name="AddOrder" component={AddOrderScreen} />
      <Stack.Screen name="AllRequests" component={AllRequestsScreen} />
    </Stack.Navigator>
  );
}