import React, { useState } from "react";
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  Alert,
  SafeAreaView
} from "react-native";
import { db, auth } from "../services/firebase"; // تأكدي من المسار
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);

  const handleBuyNow = async () => {
    if (!auth.currentUser) {
      Alert.alert("Hold on!", "You must log in first to make a request.", [
        { text: "Cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") }
      ]);
      return;
    }

    setLoading(true);
    try {
      // إرسال الطلب لـ Firestore بنفس الهيكل اللي الويب بيستخدمه
      await addDoc(collection(db, "orders"), {
        productId: product.id,
        productName: product.name,
        buyerId: auth.currentUser.uid,
        buyerName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        sellerId: product.userId || "unknown", // تأكدي إن الداتا فيها userId لصاحب المنتج
        status: "pending",
        paymentMethod: "cash_on_delivery",
        createdAt: serverTimestamp()
      });

      Alert.alert(
        "Success! 🎉", 
        "Order created successfully! Check 'My Requests' for updates.",
        [{ text: "OK", onPress: () => navigation.navigate("MyRequests") }]
      );
    } catch (error) {
      console.error("Error creating order:", error);
      Alert.alert("Error", "Could not create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* زر الرجوع */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{fontSize: 20}}>⬅️</Text>
        </Pressable>

        <View style={styles.imageCard}>
          <Image
            source={{ uri: product.photoURL || "https://via.placeholder.com/300" }}
            style={styles.image}
          />
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{product.price} <Text style={styles.currency}>EGP</Text></Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.desc}>{product.description}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoTag}>
              <Text style={styles.infoText}>Type: {product.type || "Used"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* زر الـ Action الثابت تحت */}
      <View style={styles.footer}>
        <Pressable 
          style={[styles.buyButton, loading && { opacity: 0.7 }]} 
          onPress={handleBuyNow}
          disabled={loading}
        >
          <Text style={styles.buyButtonText}>
            {loading ? "Processing..." : "Confirm Request"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingBottom: 100 },
  backBtn: {
    padding: 15,
    zIndex: 10,
  },
  imageCard: {
    width: '90%',
    height: 300,
    backgroundColor: '#f8fafc',
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  image: { width: '100%', height: '100%', resizeMode: "contain" },
  detailsContainer: { padding: 25 },
  category: { 
    color: '#3b82f6', 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    fontSize: 12,
    marginBottom: 5
  },
  name: { fontSize: 28, fontWeight: "800", color: "#1e293b" },
  price: { fontSize: 24, color: "#10b981", fontWeight: '900', marginTop: 10 },
  currency: { fontSize: 14, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  desc: { fontSize: 15, color: "#64748b", lineHeight: 22 },
  infoRow: { flexDirection: 'row', marginTop: 20 },
  infoTag: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8 },
  infoText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  buyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buyButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});