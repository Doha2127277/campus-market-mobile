import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../services/firebase"; 
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ForgetPassword({ navigation }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 

  const handleSendCode = async () => {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Please enter your university email");
      return;
    }

    if (!(trimmedEmail.endsWith(".edu") || trimmedEmail.endsWith(".edu.eg"))) {
      setError("Please use your university email (.edu.eg)");
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", trimmedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No account found with this email");
        setLoading(false);
        return;
      }
      await sendPasswordResetEmail(auth, trimmedEmail);
      setStep(2); 
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>

        {step === 1 ? (
          <>
            <Text style={styles.description}>
              Enter your university email address and we will send you a link to reset your password.
            </Text>

            <TextInput
              placeholder="name@std.sci.cu.edu.eg"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity 
              onPress={handleSendCode} 
              style={[styles.button, loading && styles.disabled]}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Check Your Email!</Text>
            <Text style={styles.successDescription}>
              A reset link has been sent to your university email. Please follow the instructions to recover your account.
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 25, backgroundColor: "#f8fafc" },
  card: { backgroundColor: "#fff", padding: 25, borderRadius: 20, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  title: { fontSize: 26, fontWeight: "800", color: "#1e293b", textAlign: "center", marginBottom: 15 },
  description: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 25, lineHeight: 20 },
  input: { backgroundColor: "#f1f5f9", padding: 16, borderRadius: 12, fontSize: 15, marginBottom: 15, color: "#1e293b" },
  button: { backgroundColor: "#4B7BEC", padding: 18, borderRadius: 12, marginTop: 5 },
  disabled: { backgroundColor: "#94a3b8" },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 },
  error: { color: "#ef4444", fontSize: 13, textAlign: "center", marginBottom: 10, fontWeight: "600" },
  successContainer: { alignItems: 'center' },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#10b981", marginBottom: 10 },
  successDescription: { textAlign: 'center', color: '#64748b', lineHeight: 22 },
  backLink: { marginTop: 20, alignSelf: 'center' },
  backLinkText: { color: "#4B7BEC", fontWeight: "600", textDecorationLine: "underline" }
});