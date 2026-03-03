// screens/RegisterScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { Picker } from "@react-native-picker/picker";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Choose");
  const [sellerRole, setSellerRole] = useState("Choose");
  const [buyerRole, setBuyerRole] = useState("Choose");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async () => {
    setErrorMsg("");
    if (!fullName || !email || !password || role === "Choose") {
      setErrorMsg("Please fill all required fields!");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (!(email.endsWith(".edu") || email.endsWith(".edu.eg"))) {
      setErrorMsg("Please use your university email (.edu or .edu.eg)");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert("Registration Successful!");
      navigation.navigate("Login");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Campus Market & Volunteer</Text>

      <TextInput placeholder="Full Name" style={styles.input} value={fullName} onChangeText={setFullName} />
      <TextInput placeholder="Email address" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput placeholder="Confirm Password" style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      <Picker selectedValue={role} onValueChange={(itemValue) => setRole(itemValue)} style={styles.picker} itemStyle={{ color: "#000" }}>
        <Picker.Item label="Choose Seller or Buyer" value="Choose" />
        <Picker.Item label="Seller" value="seller" />
        <Picker.Item label="Buyer" value="buyer" />
      </Picker>

      {role === "seller" && (
        <Picker selectedValue={sellerRole} onValueChange={(itemValue) => setSellerRole(itemValue)} style={styles.picker} itemStyle={{ color: "#000" }}>
          <Picker.Item label="Choose Seller Type" value="Choose" />
          <Picker.Item label="Normal Seller" value="normal" />
          <Picker.Item label="Volunteer" value="volunteer" />
        </Picker>
      )}

      {role === "buyer" && (
        <Picker selectedValue={buyerRole} onValueChange={(itemValue) => setBuyerRole(itemValue)} style={styles.picker} itemStyle={{ color: "#000" }}>
          <Picker.Item label="Choose Buyer Type" value="Choose" />
          <Picker.Item label="Normal" value="no" />
          <Picker.Item label="In Need" value="yes" />
        </Picker>
      )}

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
        <Text style={styles.registerText}>Register</Text>
      </TouchableOpacity>

      <View style={styles.links}>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#e2ecf7", // لون خلفية فاتح أزرق
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#4B7BEC",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#4B7BEC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    backgroundColor: "#fff",
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  picker: {
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#4B7BEC",
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "600",
  },
  registerBtn: {
    backgroundColor: "#4B7BEC",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 20,
    shadowColor: "#4B7BEC",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  registerText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  links: {
    alignItems: "center",
  },
  linkText: {
    color: "#4B7BEC",
    fontWeight: "600",
    textDecorationLine: "underline",
    marginVertical: 5,
  },
});