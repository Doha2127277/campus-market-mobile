import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Linking } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProductDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // التعديل الجوهري هنا: بنقرأ الـ id من جوه الـ product اللي جاي في الـ params
  const productId = route.params?.product?.id || route.params?.id; 

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // لو البيانات مبعوتة كاملة أصلاً في الـ params، نستخدمها علطول بدل ما نكلم Firebase
    if (route.params?.product) {
      setProduct(route.params.product);
      setLoading(false);
      return;
    }

    if (!productId) {
      Alert.alert("خطأ", "لم يتم العثور على معرّف المنتج.");
      if (navigation.canGoBack()) navigation.goBack();
      return;
    }

    const getProductData = async () => {
      try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct(docSnap.data());
        }
      } catch (error) {
        console.log("Firebase Error:", error);
      } finally {
        setLoading(false);
      }
    };

    getProductData();
  }, [productId, route.params?.product]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* عرض الصورة مع التأكد من وجودها */}
      <Image 
        source={{ uri: product.photoURL || "https://via.placeholder.com/350" }} 
        style={styles.image} 
        resizeMode="cover" 
      />

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{product.price} EGP</Text>
        
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>القسم: {product.category}</Text>
          <Text style={styles.tag}>الحالة: {product.status === 'approved' ? 'مقبول' : 'انتظار'}</Text>
        </View>

        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionTitle}>الوصف:</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => Alert.alert("تم", "أضيف للسلة")}
        >
          <Text style={styles.buttonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 30, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: 350 },
  infoContainer: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, backgroundColor: '#fff' },
  name: { fontSize: 26, fontWeight: "bold", color: '#1e293b' },
  price: { fontSize: 22, color: "#10b981", fontWeight: "800", marginVertical: 10 },
  tagContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tag: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, fontSize: 12, color: '#64748b' },
  descriptionBox: { marginBottom: 25 },
  descriptionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 5 },
  description: { fontSize: 16, color: '#475569', lineHeight: 24 },
  button: { backgroundColor: "#2563eb", padding: 15, borderRadius: 15, alignItems: 'center' },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});


