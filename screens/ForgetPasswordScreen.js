import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";

export default function ForgetPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSendCode = async () => {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Invalid email format");
      return;
    }

    const parts = trimmedEmail.split("@");
    if (parts.length !== 2) {
      setError("Invalid email format");
      return;
    }

    const domain = parts[1];
    const blocked = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

    if (blocked.includes(domain)) {
      setError("Public emails are not allowed. Use your university email.");
      return;
    }

    if (!(domain.endsWith(".edu") || domain.endsWith(".edu.eg"))) {
      setError("Use your university email (.edu)");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccess(true);
    } catch (err) {
      setError("Failed to send reset email. Check your email address.");
      console.log(err);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.success}>Reset link sent to your email!</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forget Password</Text>
      <TextInput
        placeholder="Enter your university email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity onPress={handleSendCode} style={styles.button}>
        <Text style={styles.buttonText}>Get Reset Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "#e2ecf7" },
  title: { fontSize: 24, marginBottom: 20, fontWeight: "bold", textAlign: "center" ,color: "#4B7BEC",},
  input: { borderWidth: 1, borderColor: "#ccc", padding: 15, borderRadius: 10, backgroundColor: "#fff", marginBottom: 15 },
  button: { backgroundColor: "#4B7BEC", padding: 15, borderRadius: 10 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
  success: { color: "green", fontSize: 18, textAlign: "center", marginBottom: 20 },
  link: { color: "#4B7BEC", textAlign: "center", marginTop: 10, fontWeight: "600" },
});