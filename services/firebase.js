import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBlBab2EuXfrYJNZxtV2IwL92xZgw3v_so",
  authDomain: "campusmarket-ec426.firebaseapp.com",
  projectId: "campusmarket-ec426",
  storageBucket: "campusmarket-ec426.appspot.com",
  messagingSenderId: "416912511957",
  appId: "1:416912511957:web:3e64991acf1e628685635c",
  measurementId: "G-Z7VYV1WE4B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);
