import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlBab2EuXfrYJNZxtV2IwL92xZgw3v_so", 
  authDomain: "campusmarket-ec426.firebaseapp.com",
  projectId: "campusmarket-ec426",
  storageBucket: "campusmarket-ec426.firebasestorage.app",
  messagingSenderId: "416912511957",
  appId: "1:416912511957:web:3e64991acf1e628685635c",
  measurementId: "G-Z7VYV1WE4B"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);