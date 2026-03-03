// screens/LoginScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

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
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Login Successful!");
    } catch{
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
      />

      <TextInput
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
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