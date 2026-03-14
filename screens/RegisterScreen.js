import React, { useState } from "react";
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    ScrollView, 
    Alert,
    ActivityIndicator 
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebase"; 
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setErrorMsg("");
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill all required fields!");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (!(email.toLowerCase().endsWith(".edu") || email.toLowerCase().endsWith(".edu.eg"))) {
      setErrorMsg("Please use your university email (.edu or .edu.eg)");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        role: "user", 
        createdAt: serverTimestamp()
      });

      Alert.alert("Success", "Account created successfully!");
      navigation.replace("Login");

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg("This email is already in use.");
      } else {
        setErrorMsg("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Campus Market</Text>
        <Text style={styles.subtitle}>Join our university community today</Text>
      </View>

      <View style={styles.form}>
        <TextInput 
          placeholder="Full Name" 
          style={styles.input} 
          value={fullName} 
          onChangeText={setFullName} 
          placeholderTextColor="#94a3b8"
        />
        
        <TextInput 
          placeholder="University Email (.edu.eg)" 
          style={styles.input} 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address" 
          autoCapitalize="none" 
          placeholderTextColor="#94a3b8"
        />
        
        <TextInput 
          placeholder="Password" 
          style={styles.input} 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
          placeholderTextColor="#94a3b8"
        />
        
        <TextInput 
          placeholder="Confirm Password" 
          style={styles.input} 
          value={confirmPassword} 
          onChangeText={setConfirmPassword} 
          secureTextEntry 
          placeholderTextColor="#94a3b8"
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <TouchableOpacity 
          style={[styles.registerBtn, loading && styles.btnDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 25, backgroundColor: "#f8fafc" },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: "900", color: "#2563eb", letterSpacing: -1 },
  subtitle: { fontSize: 16, color: "#64748b", marginTop: 5 },
  form: { width: "100%" },
  input: { 
    backgroundColor: "#fff", 
    borderWidth: 1, 
    borderColor: "#e2e8f0", 
    borderRadius: 15, 
    padding: 18, 
    marginBottom: 15, 
    fontSize: 16,
    color: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  error: { color: "#ef4444", textAlign: "center", marginBottom: 15, fontWeight: "600" },
  registerBtn: { 
    backgroundColor: "#2563eb", 
    padding: 20, 
    borderRadius: 15, 
    marginTop: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  btnDisabled: { backgroundColor: "#94a3b8" },
  registerText: { color: "#fff", textAlign: "center", fontWeight: "800", fontSize: 18 },
  linkContainer: { marginTop: 25, alignItems: 'center' },
  linkText: { color: "#64748b", fontSize: 15 },
  linkBold: { color: "#2563eb", fontWeight: "700", textDecorationLine: "underline" }
});