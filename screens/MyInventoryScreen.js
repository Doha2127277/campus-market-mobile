import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert
} from "react-native";

import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

export default function MyInventoryScreen() {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {

      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "Please login first");
        return;
      }

      try {
        const q = query(
          collection(db, "products"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        const list = [];

        snapshot.forEach((docItem) => {
          list.push({
            id: docItem.id,
            ...docItem.data()
          });
        });

        setProducts(list);

      } catch (error) {
        console.log(error);
      }

      setLoading(false);
    };

    fetchProducts();

  }, []);

  const deleteProduct = async (id) => {

    Alert.alert(
      "Delete",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {

            await deleteDoc(doc(db, "products", id));

            setProducts(products.filter(p => p.id !== id));
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {

    const s = status?.toLowerCase();

    if (s === "approved" || s === "verified") return "#10b981";
    if (s === "rejected") return "#ef4444";

    return "#f59e0b";
  };

  const renderItem = ({ item }) => (

    <View style={styles.card}>

      {item.photoURL &&
        <Image
          source={{ uri: item.photoURL }}
          style={styles.image}
        />
      }

      <Text style={styles.name}>{item.name}</Text>

      <Text style={styles.price}>{item.price} EGP</Text>

      <Text style={styles.meta}>
        {item.type === "Donate" ? "Donation" : "For Sale"} | {item.category}
      </Text>

      <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
        Status: {item.status || "pending"}
      </Text>

      <View style={styles.actions}>

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteProduct(item.id)}
        >
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>

      </View>

    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (

    <View style={styles.container}>

      <Text style={styles.title}>My Inventory</Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No products found</Text>
        }
      />

    </View>

  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },

  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3
  },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10
  },

  name: {
    fontSize: 18,
    fontWeight: "bold"
  },

  price: {
    color: "#2563eb",
    fontWeight: "bold",
    marginVertical: 5
  },

  meta: {
    color: "#64748b",
    marginBottom: 5
  },

  status: {
    fontWeight: "bold",
    marginBottom: 10
  },

  actions: {
    flexDirection: "row",
    gap: 10
  },

  editBtn: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center"
  },

  deleteBtn: {
    backgroundColor: "#ef4444",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: "center"
  },

  btnText: {
    color: "white",
    fontWeight: "bold"
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b"
  }

});