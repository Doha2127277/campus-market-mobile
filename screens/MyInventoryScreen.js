import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import { db, auth } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";

export default function MyInventoryScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "Please login first");
      return;
    }
    try {
      const q = query(collection(db, "products"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach((docItem) => {
        list.push({ id: docItem.id, ...docItem.data() });
      });
      setProducts(list);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setNewName(product.name);
    setNewPrice(product.price.toString());
    setNewCategory(product.category || "");
    setNewType(product.type || "");
    setNewDescription(product.description || "");
    setIsModalOpen(true);
  };

  const saveEdit = async () => {
    if (!newName.trim() || !newPrice.trim() || !newDescription.trim()) {
      Alert.alert("Missing Info", "Please fill in all fields ");
      return; 
    }
    if (isNaN(newPrice) || Number(newPrice) < 0) {
      Alert.alert("Invalid Price", "Please enter a valid price number");
      return;
    }
    try {
      const productRef = doc(db, "products", editingProduct.id);
      await updateDoc(productRef, {
        name: newName,
        price: Number(newPrice),
        category: newCategory,
        type: newType,
        description: newDescription,
        status: "pending"
      });

      setProducts(products.map(p => p.id === editingProduct.id ? 
        { 
          ...p, 
          name: newName, 
          price: Number(newPrice), 
          category: newCategory, 
          type: newType, 
          description: newDescription,
          status: "pending" 
        } : p
      ));

      Alert.alert("Success", "Updated successfully!");
      setIsModalOpen(false);
    } catch {
      Alert.alert("Error", "Update failed");
    }
  };

  const deleteProduct = async (id) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          await deleteDoc(doc(db, "products", id));
          setProducts(products.filter(p => p.id !== id));
        }
      }
    ]);
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    if (s === "approved" || s === "verified") return "#10b981";
    if (s === "rejected") return "#ef4444";
    return "#f59e0b";
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.photoURL && <Image source={{ uri: item.photoURL }} style={styles.image} />}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>{item.price} EGP</Text>
      <Text style={styles.meta}>
        {item.type === "Donate" ? "Donation" : "For Sale"} | {item.category}
      </Text>
      <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
        Status: {item.status || "pending"}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(item.id)}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#a50c0c" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Inventory</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
      />

      <Modal visible={isModalOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit All Details</Text>
              
              <Text style={styles.label}>Product Name</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} />
              
              <Text style={styles.label}>Price (EGP)</Text>
              <TextInput style={styles.input} value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" />

              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={newDescription} 
                onChangeText={setNewDescription} 
                multiline 
                numberOfLines={3} 
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={newCategory} onValueChange={setNewCategory}>
                  <Picker.Item label="Engineering" value="Engineering" />
                  <Picker.Item label="Medicine" value="Medicine" />
                  <Picker.Item label="Business" value="Business" />
                </Picker>
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={newType} onValueChange={setNewType}>
                  <Picker.Item label="For Sale" value="Sell" />
                  <Picker.Item label="Donation" value="Donate" />
                </Picker>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                  <Text style={styles.btnText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  card: { backgroundColor: "white", padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  image: { width: "100%", height: 180, borderRadius: 10, marginBottom: 10 },
  name: { fontSize: 18, fontWeight: "bold" },
  price: { color: "#2563eb", fontWeight: "bold", marginVertical: 5 },
  meta: { color: "#64748b", marginBottom: 5 },
  status: { fontWeight: "bold", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 10 },
  editBtn: { backgroundColor: "#2563eb", padding: 10, borderRadius: 6, flex: 1, alignItems: "center" },
  deleteBtn: { backgroundColor: "#ef4444", padding: 10, borderRadius: 6, flex: 1, alignItems: "center" },
  btnText: { color: "white", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 40, color: "#64748b" },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modalScroll: { paddingVertical: 50, paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1e293b' },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 5, marginLeft: 5 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 15, backgroundColor: '#f1f5f9' },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 20, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  saveBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, flex: 2, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#94a3b8', padding: 15, borderRadius: 10, flex: 1, alignItems: 'center' }
});