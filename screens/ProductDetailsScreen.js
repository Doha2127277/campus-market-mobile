import React, { useState, useEffect } from "react";
import { 
  View, Text, Image, StyleSheet, Pressable, 
  ScrollView, StatusBar 
} from "react-native";
import { auth, db } from "../services/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params;
  const [cart, setCart] = useState([]);
  const [localIsInCart, setLocalIsInCart] = useState(false);
  const [fetchingCart, setFetchingCart] = useState(true);
  const [sellerName, setSellerName] = useState("...");

  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const idToSearch = product.userId || product.sellerId;
        if (idToSearch) {
          const userDoc = await getDoc(doc(db, "users", idToSearch));
          if (userDoc.exists()) {
            setSellerName(userDoc.data().fullName || "Campus User");
          }
        }
      } catch {
        setSellerName("Seller");
      }
    };

    const loadCartStatus = async () => {
      try {
        const user = auth.currentUser;
        const cartKey = user ? `userCart_${user.uid}` : 'guestCart';
        const savedCart = await AsyncStorage.getItem(cartKey);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
          setLocalIsInCart(parsedCart.some(item => item.id === product.id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingCart(false);
      }
    };

    fetchSellerInfo();
    loadCartStatus();
  }, [product.id, product.userId, product.sellerId]);

  const handleToggleCart = async () => {
    try {
      const user = auth.currentUser;
      const cartKey = user ? `userCart_${user.uid}` : 'guestCart';
      let updatedCart;
      if (localIsInCart) {
        updatedCart = cart.filter(item => item.id !== product.id);
      } else {
        updatedCart = [...cart, product];
      }
      setCart(updatedCart);
      setLocalIsInCart(!localIsInCart);
      await AsyncStorage.setItem(cartKey, JSON.stringify(updatedCart));
    } catch (e) {
      console.error(e);
    }
  };

  const formattedDate = product.createdAt?.seconds 
    ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() 
    : "Recently";

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      
      <View style={styles.customHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={30} color="#1e293b" />
        </Pressable>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.imageWrapper}>
          <Image source={{ uri: product.photoURL }} style={styles.mainImage} />
          <View style={[styles.modeBadge, { backgroundColor: product.mode === 'Volunteer' ? '#c01b1b' : '#47d40e' }]}>
            <Text style={styles.modeText}>{product.mode}</Text>
          </View>
        </View>

        
        <View style={styles.contentSection}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{product.price} EGP</Text>
            <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          </View>

          <View style={styles.sellerInfo}>
            <MaterialCommunityIcons name="account-circle" size={20} color="#64748b" />
            <Text style={styles.sellerNameText}>Sold by: {sellerName}</Text>
            <View style={styles.dot} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{product.description || "No description provided."}</Text>
        </View>
      </ScrollView>

      
      <View style={styles.footer}>
        <Pressable 
          style={[styles.cartBtn, localIsInCart && styles.cartBtnRemove]} 
          onPress={handleToggleCart}
          disabled={fetchingCart}
        >
           <Text style={styles.cartBtnText}>
             {localIsInCart ? "Remove from Cart" : "Add to Cart"}
           </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff' },
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 5, backgroundColor: '#f1f5f9', borderRadius: 10 },
  imageWrapper: { width: '100%', height: 350 },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modeBadge: { position: 'absolute', bottom: 15, right: 15, padding: 8, borderRadius: 10 },
  modeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  contentSection: { padding: 20 },
  productName: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  productPrice: { fontSize: 22, fontWeight: '900', color: '#10b981' },
  categoryBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sellerNameText: { fontSize: 14, color: '#64748b', marginLeft: 5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginHorizontal: 10 },
  dateText: { fontSize: 14, color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  descriptionText: { fontSize: 16, color: '#475569', lineHeight: 24, marginBottom: 100 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cartBtn: { backgroundColor: '#3b82f6', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cartBtnRemove: { backgroundColor: '#ef4444' },
  cartBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});