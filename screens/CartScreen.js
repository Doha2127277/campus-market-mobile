import React, { useState, useEffect } from "react";
import { 
  View, Text, FlatList, Image, StyleSheet, 
  Pressable, Alert, ActivityIndicator 
} from "react-native";
import { auth, db } from "../services/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CartScreen({ navigation, route }) {
  const { cart: initialCart, setCart: updateParentCart } = route.params;
  const [localCart, setLocalCart] = useState(initialCart);
  const [loading, setLoading] = useState(false);
  
  const totalPrice = localCart.reduce((sum, item) => sum + Number(item.price), 0);

  const removeItem = async (id) => {
    const updatedCart = localCart.filter(item => {
      const itemId = item.id || item._id;
      return String(itemId) !== String(id);
    });

    setLocalCart(updatedCart); 
    updateParentCart(updatedCart);

    const user = auth.currentUser;
    const cartKey = user ? `userCart_${user.uid}` : 'guestCart';
    try {
      await AsyncStorage.setItem(cartKey, JSON.stringify(updatedCart));
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const handleCheckout = async () => {
    if (!auth.currentUser) {
      Alert.alert("Login Required", "Please login to place an order.");
      return;
    }

    if (localCart.length === 0) return;

    setLoading(true);
    try {
      let realName = "Student"; 
      const userRef = doc(db, "users", auth.currentUser.uid); 
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        realName = userSnap.data().fullName || "Student";
      }

      const ordersBySeller = localCart.reduce((acc, item) => {
        const sId = item.userId || item.sellerId || "unknown";
        if (!acc[sId]) {
          acc[sId] = {
            items: [],
            total: 0,
          };
        }
        acc[sId].items.push(item);
        acc[sId].total += Number(item.price);
        return acc;
      }, {});

      const sellerIds = Object.keys(ordersBySeller);

      await Promise.all(sellerIds.map(async (sId) => {
        const orderData = ordersBySeller[sId];
        await addDoc(collection(db, "orders"), {
          buyerId: auth.currentUser.uid,
          buyerName: realName,
          sellerId: sId,
          items: orderData.items, 
          totalAmount: orderData.total,
          status: "pending", 
          comments: [],
          createdAt: serverTimestamp(),
        });
      }));

      setLocalCart([]);
      updateParentCart([]);
      const cartKey = `userCart_${auth.currentUser.uid}`;
      await AsyncStorage.removeItem(cartKey);

      Alert.alert("Success! 🎉", `Your order has been split into ${sellerIds.length} separate requests.`);
      navigation.navigate("Home");

    } catch (error) {
      console.error("Error splitting orders:", error);
      Alert.alert("Error", "Something went wrong while placing orders.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.photoURL }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemPrice}>{item.price} EGP</Text>
      </View>
      <Pressable onPress={() => removeItem(item.id || item._id)} style={styles.removeBtn}>
        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={30} color="#1e293b" />
        </Pressable>
        <Text style={styles.headerTitle}>My Cart ({localCart.length})</Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={localCart}
        extraData={localCart}
        keyExtractor={(item) => (item.id || item._id).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cart-off" size={80} color="#cbd5e1" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Pressable style={styles.shopBtn} onPress={() => navigation.navigate("Home")}>
              <Text style={styles.shopBtnText}>Go Shopping</Text>
            </Pressable>
          </View>
        }
      />

      {localCart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{totalPrice} EGP</Text>
          </View>
          <Pressable 
            style={[styles.checkoutBtn, loading && { opacity: 0.7 }]} 
            onPress={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutBtnText}>Confirm Order</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  listContent: { padding: 20 },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 15, alignItems: 'center', elevation: 2 },
  itemImage: { width: 70, height: 70, borderRadius: 10 },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  itemCategory: { fontSize: 12, color: '#94a3b8', marginVertical: 2 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#2563eb' },
  removeBtn: { padding: 5 },
  footer: { backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  totalLabel: { fontSize: 16, color: '#64748b' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  checkoutBtn: { backgroundColor: '#3b82f6', paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, color: '#94a3b8', marginTop: 20 },
  shopBtn: { marginTop: 20, backgroundColor: '#f1f5f9', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  shopBtnText: { color: '#3b82f6', fontWeight: '700' }
});