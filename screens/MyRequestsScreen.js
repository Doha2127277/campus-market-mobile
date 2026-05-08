import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Pressable, Image, StatusBar, TextInput, Alert
} from "react-native";
import { auth, db } from "../services/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, onSnapshot, orderBy } from "firebase/firestore";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Rating } from 'react-native-ratings';

export default function MyRequestsScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [sellersNames, setSellersNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});
  const [tempRatings, setTempRatings] = useState({});
  // لتخزين الـ unsubscribers لتنظيف الـ listeners بعد ما نخرج من الشاشة
  const [unsubscribers, setUnsubscribers] = useState({});

  useEffect(() => {
    fetchOrdersWithRealTime();
    // cleanup function: لما المستخدم يخرج من الشاشة، نقفل كل الـ listeners عشان نقلل استهلاك البطارية
    return () => {
      Object.values(unsubscribers).forEach(unsub => {
        if (unsub) unsub();
      });
    };
  }, []);

  const fetchOrdersWithRealTime = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("buyerId", "==", auth.currentUser.uid));
      
      // أول مرة نجيب الداتا بشكل عادي (مرة واحدة) لعرضها بسرعة
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      const sellerIds = [...new Set(sortedData.map(order => order.sellerId))];
      const namesMap = {};
      await Promise.all(sellerIds.map(async (sId) => {
        if (!sId || sId === "unknown") return;
        const userDoc = await getDoc(doc(db, "users", sId));
        if (userDoc.exists()) namesMap[sId] = userDoc.data().fullName || userDoc.data().name || "Seller";
      }));

      setSellersNames(namesMap);
      setOrders(sortedData);

      // هنا السحر: بنعمل Real-time listener لكل order عشان نسمع التحديثات فوراً (زي وصول رسالة جديدة من البايع)
      const newUnsubscribers = {};
      sortedData.forEach(order => {
        const orderRef = doc(db, "orders", order.id);
        // listener يسمع أي تغيير في هذا الـ order بالذات
        const unsubscribe = onSnapshot(orderRef, (docSnap) => {
          if (docSnap.exists()) {
            const updatedOrder = { id: docSnap.id, ...docSnap.data() };
            setOrders(prevOrders => 
              prevOrders.map(prev => prev.id === updatedOrder.id ? updatedOrder : prev)
            );
          }
        });
        newUnsubscribers[order.id] = unsubscribe;
      });
      setUnsubscribers(newUnsubscribers);
      
    } catch (error) {
      console.error("Error: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateOrder = async (orderId, sellerId) => {
    const stars = tempRatings[orderId];
    if (!stars || stars === 0) {
      Alert.alert("Wait", "Please select stars first");
      return;
    }

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { 
        isRated: true,
        orderRating: stars 
      });

      const sellerRef = doc(db, "users", sellerId);
      const sellerSnap = await getDoc(sellerRef);
      
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data();
        const currentRating = sellerData.rating || 5; 
        const totalReviews = sellerData.totalReviews || 0;
        const newTotal = totalReviews + 1;
        const newRating = ((currentRating * totalReviews) + stars) / newTotal;

        await updateDoc(sellerRef, {
          rating: newRating,
          totalReviews: newTotal
        });
        Alert.alert("Success", "Rating submitted!");
        // مش لازم fetchOrders لأن الـ listener هيحدث الـ order تلقائياً
      }
    } catch (error) {
      console.error("Rating Error:", error);
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
        senderRole: 'buyer', 
        createdAt: new Date().toISOString()
      };
      await updateDoc(orderRef, { comments: arrayUnion(newComment) });
      setCommentText({ ...commentText, [orderId]: "" });
      // لا حاجة لـ fetchOrders() لأن الـ listener هيحدث الواجهة فوراً
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
    const displaySellerName = sellersNames[item.sellerId] || item.sellerName || "Seller";
    
    // ترتيب التعليقات من الأقدم للأحدث لمشاهدة طبيعية للمحادثة
    const sortedComments = item.comments ? [...item.comments].sort((a, b) => 
      (a.createdAt?.localeCompare(b.createdAt))
    ) : [];

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, { backgroundColor: status.bg }]}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="calendar-month" size={16} color={status.text} />
            <Text style={[styles.dateText, { color: status.text }]}>
              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "Recently"}
            </Text>
          </View>
          <Text style={[styles.statusLabel, { color: status.text }]}>{item.status || "Pending"}</Text>
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

        {/* Rating Section with Submit */}
        {item.status?.toLowerCase() === "approved" && (
          <View style={styles.ratingBox}>
            <Text style={styles.rateTitle}>{item.isRated ? "Your Rating" : "Rate Experience"}</Text>
            <View style={{ alignItems: 'center' }}>
                <Rating
                  type='star'
                  ratingCount={5}
                  imageSize={22}
                  startingValue={item.orderRating || 0}
                  readonly={item.isRated}
                  onFinishRating={(stars) => setTempRatings({ ...tempRatings, [item.id]: stars })}
                />
                {!item.isRated && (
                  <Pressable 
                    style={styles.submitRatingBtn} 
                    onPress={() => handleRateOrder(item.id, item.sellerId)}
                  >
                    <Text style={styles.submitRatingText}>Submit</Text>
                  </Pressable>
                )}
            </View>
          </View>
        )}

        <View style={styles.commentsSection}>
          <Text style={styles.commentTitle}>Chat with Seller</Text>
          {sortedComments.length > 0 ? (
            sortedComments.map((c, i) => {
              // التحقق من هوية المرسل بشكل آمن
              const isMe = c.senderId === auth.currentUser.uid;
              return (
                <View key={i} style={[styles.commentBubble, isMe ? styles.myComment : styles.sellerComment]}>
                  <Text style={[styles.commentSender, isMe ? styles.mySender : styles.sellerSender]}>
                    {isMe ? "Me" : displaySellerName}
                  </Text>
                  <Text style={[styles.commentText, isMe ? styles.myCommentText : styles.sellerCommentText]}>
                    {c.text}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.noComments}>No messages yet</Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Write a message..."
              value={commentText[item.id] || ""}
              onChangeText={(txt) => setCommentText({ ...commentText, [item.id]: txt })}
            />
            <Pressable onPress={() => handleAddComment(item.id)} style={styles.sendBtn}>
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.sellerInfo}>
            <MaterialCommunityIcons name="storefront" size={18} color="#1d0aca" />
            <Text style={styles.sellerName}>{displaySellerName}</Text>
          </View>
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
        <Text style={styles.mainTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  mainHeader: { backgroundColor: '#1d0aca', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  backCircle: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  list: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 20, marginBottom: 20, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: '700', marginLeft: 5 },
  statusLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  cardBody: { padding: 15 },
  productItem: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  prodImg: { width: 50, height: 50, borderRadius: 8 },
  prodInfo: { marginLeft: 10 },
  prodName: { fontSize: 15, fontWeight: '700' },
  prodPrice: { fontSize: 13, color: '#1d0aca', fontWeight: '800' },
  ratingBox: { padding: 15, alignItems: 'center', backgroundColor: '#fcfcfc', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  rateTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 5 },
  submitRatingBtn: { backgroundColor: '#1d0aca', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginTop: 10 },
  submitRatingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  commentsSection: { padding: 15, backgroundColor: '#F1F5F9', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  commentTitle: { fontSize: 13, fontWeight: '800', color: '#6982a5', marginBottom: 10 },
  commentBubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  myComment: { backgroundColor: '#1c0abd', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  sellerComment: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  commentSender: { fontSize: 10, fontWeight: '900', marginBottom: 2 },
  mySender: { color: 'rgba(255,255,255,0.7)' },
  sellerSender: { color: '#1e293b' },
  commentText: { fontSize: 14, fontWeight: '600' },
  myCommentText: { color: '#fff' },
  sellerCommentText: { color: '#0f172a' },
  noComments: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14, borderWidth: 1, borderColor: '#CBD5E1' },
  sendBtn: { backgroundColor: '#1d0aca', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
  sellerInfo: { flexDirection: 'row', alignItems: 'center' },
  sellerName: { marginLeft: 5, fontSize: 14, fontWeight: '700', color: '#64748b' },
  totalAmount: { fontSize: 18, fontWeight: '900', color: '#1e293b' }
});