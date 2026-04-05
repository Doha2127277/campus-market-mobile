import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Pressable, Image, StatusBar, TextInput, Alert
} from "react-native";
import { auth, db } from "../services/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SellerOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});

  useEffect(() => {
    fetchSellerOrders();
  }, []);

  const fetchSellerOrders = async () => {
    if (!auth.currentUser) return;
    try {
      console.log("My Current ID is:", auth.currentUser.uid);
      const q = query(
        collection(db, "orders"),
        where("sellerId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const sortedData = data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(sortedData);
    } catch (error) {
      console.error("Error fetching seller orders: ", error);
    } finally {
      setLoading(false);
    }
  };

  
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      Alert.alert("Success", `Order has been ${newStatus}`);
      fetchSellerOrders(); 
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAddComment = async (orderId) => {
    const text = commentText[orderId];
    if (!text || text.trim() === "") return;

    try {
      const orderRef = doc(db, "orders", orderId);
      const newComment = {
        text: text.trim(),
        senderId: auth.currentUser.uid,
        senderRole: 'seller', 
        createdAt: new Date().toISOString()
      };

      await updateDoc(orderRef, {
        comments: arrayUnion(newComment)
      });

      setCommentText({ ...commentText, [orderId]: "" });
      fetchSellerOrders();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return { bg: '#E8F5E9', text: '#2E7D32', icon: 'check-decagram' };
      case 'rejected': return { bg: '#FFEBEE', text: '#C62828', icon: 'close-octagon' };
      default: return { bg: '#FFF3E0', text: '#EF6C00', icon: 'timer-sand' };
    }
  };

  const renderOrder = ({ item }) => {
    const status = getStatusConfig(item.status);

    return (
      <View style={styles.card}>
        
        <View style={[styles.cardHeader, { backgroundColor: status.bg }]}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="account-arrow-left" size={18} color={status.text} />
            <Text style={[styles.buyerName, { color: status.text }]}>Buyer: {item.buyerName || "Student"}</Text>
          </View>
          <View style={styles.statusBadge}>
             <Text style={[styles.statusLabel, { color: status.text }]}>{item.status || "Pending"}</Text>
          </View>
        </View>

        
        <View style={styles.cardBody}>
          {item.items?.map((prod, index) => (
            <View key={index} style={styles.productItem}>
              <Image source={{ uri: prod.photoURL }} style={styles.prodImg} />
              <View style={styles.prodInfo}>
                <Text style={styles.prodName}>{prod.name}</Text>
                <Text style={styles.prodPrice}>{prod.price} EGP</Text>
              </View>
            </View>
          ))}
        </View>

        
        {(!item.status || item.status === "pending") && (
          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.btn, styles.approveBtn]} 
              onPress={() => updateOrderStatus(item.id, "approved")}
            >
              <Text style={styles.btnText}>Approve</Text>
            </Pressable>
            <Pressable 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={() => updateOrderStatus(item.id, "rejected")}
            >
              <Text style={styles.btnText}>Reject</Text>
            </Pressable>
          </View>
        )}

        
        <View style={styles.commentsSection}>
          {item.comments?.map((c, i) => (
            <View key={i} style={[styles.commentBubble, c.senderId === auth.currentUser.uid ? styles.myComment : styles.buyerComment]}>
              <Text style={styles.commentSender}>{c.senderId === auth.currentUser.uid ? "Me (Seller)" : "Buyer"}</Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Reply to buyer..."
              value={commentText[item.id] || ""}
              onChangeText={(txt) => setCommentText({ ...commentText, [item.id]: txt })}
            />
            <Pressable onPress={() => handleAddComment(item.id)} style={styles.sendBtn}>
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        
        <View style={styles.cardFooter}>
           <Text style={styles.totalLabel}>Total Income:</Text>
           <Text style={styles.totalAmount}>{item.totalAmount} EGP</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#1d0aca" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mainHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backCircle}>
          <MaterialCommunityIcons name="chevron-left" size={30} color="#fff" />
        </Pressable>
        <Text style={styles.mainTitle}>Sales Manager</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyTxt}>No orders received yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  mainHeader: { backgroundColor: '#1d0aca', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  mainTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  backCircle: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  list: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 20, marginBottom: 20, elevation: 4, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  buyerName: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
  statusLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  cardBody: { padding: 15 },
  productItem: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  prodImg: { width: 55, height: 55, borderRadius: 10 },
  prodInfo: { marginLeft: 12 },
  prodName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  prodPrice: { fontSize: 14, color: '#1d0aca', fontWeight: '800' },
  
  actionButtons: { flexDirection: 'row', padding: 15, justifyContent: 'space-between', backgroundColor: '#F8FAFC' },
  btn: { flex: 0.48, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  approveBtn: { backgroundColor: '#2E7D32' },
  rejectBtn: { backgroundColor: '#C62828' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  commentsSection: { padding: 15, backgroundColor: '#F1F5F9' },
  commentBubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  myComment: { backgroundColor: '#1c0abd', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  buyerComment: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  commentSender: { fontSize: 10, fontWeight: '900', color: 'rgba(0,0,0,0.5)', marginBottom: 2 },
  commentText: { fontSize: 14, color: '#3c547a', fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14 },
  sendBtn: { backgroundColor: '#1d0aca', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  totalLabel: { color: '#64748b', fontWeight: '700' },
  totalAmount: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  emptyTxt: { textAlign: 'center', marginTop: 50, color: '#94a3b8', fontSize: 16 }
});