import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Please enter email and password");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role || 'user';
        const userName = userData.name || email.split('@')[0];

        await AsyncStorage.setItem('userRole', userRole);
        await AsyncStorage.setItem('userName', userName);
        
        navigation.replace("Home");
      } else {
        setErrorMsg("User data not found in database.");
      }
    } catch (error) {
      setErrorMsg("Invalid email or password");
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>Login to Campus Market</Text>

        <TextInput
          placeholder="Enter university email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.links}>
        <TouchableOpacity onPress={() => navigation.navigate("ForgetPassword")}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>Create an Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#e2ecf7",
  },
  top: {
    marginTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4B7BEC",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#4B7BEC",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#333",
  },
  error: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: "#4B7BEC",
    padding: 15,
    borderRadius: 10,
  },
  loginText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  links: {
    marginTop: 15,
    alignItems: "center", 
  },
  linkText: {
    color: "#4B7BEC",       
    fontWeight: "600",
    textDecorationLine: "underline", 
    marginVertical: 5,      
  },
});