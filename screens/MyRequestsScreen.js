import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from "react-native";
import { auth, db } from "../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function MyRequestsScreen() {
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
        console.log("Error: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // دالة بسيطة عشان نحدد لون الحالة (Status)
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#10b981'; // أخضر
      case 'rejected': return '#ef4444'; // أحمر
      default: return '#f59e0b'; // برتقالي للـ pending
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Requests</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.product}>{item.productName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status || 'pending'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment:</Text>
              <Text style={styles.infoValue}>{item.paymentMethod === 'cash_on_delivery' ? 'Cash' : item.paymentMethod}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: '#94a3b8' }}>No requests yet 📦</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc"
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 20,
    marginTop: 20
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  product: {
    fontSize: 18,
    fontWeight: "700",
    color: '#1e293b',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 14
  },
  infoValue: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 14
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});