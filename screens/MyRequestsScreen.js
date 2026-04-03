import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  StatusBar
} from "react-native";
import { auth, db } from "../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";

export default function MyRequestsScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "orders"),
          where("buyerId", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(data);
      } catch (error) {
        console.error("Error: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return { bg: '#dcfce7', text: '#166534' };
      case 'rejected': return { bg: '#fee2e2', text: '#991b1b' };
      case 'pending': return { bg: '#fef3c7', text: '#92400e' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  // دالة لتنسيق التاريخ
  const formatDate = (timestamp) => {
    if (!timestamp) return "Recent";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backCircle}>
          <Text style={{ fontSize: 18 }}>⬅️</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>ITEM NAME</Text>
                  <Text style={styles.productName}>{item.productName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {item.status?.toUpperCase() || "PENDING"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardBottom}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Payment</Text>
                  <Text style={styles.infoValue}>💵 Cash</Text>
                </View>
                
                {/* التعديل هنا: التاريخ بدل الـ ID */}
                <View style={[styles.infoBox, { alignItems: 'flex-end' }]}>
                  <Text style={styles.infoLabel}>Requested On</Text>
                  <Text style={styles.infoValue}>📅 {formatDate(item.createdAt)}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={{ fontSize: 60 }}>📂</Text>
            <Text style={styles.emptyText}>No requests found yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 4 },
  productName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#f8fafc', marginVertical: 15 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#475569' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyView: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#94a3b8', fontSize: 16 }
});