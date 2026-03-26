import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import { db, auth } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as ImagePicker from 'expo-image-picker';

const uploadToCloudinary = async (uri) => {
  const formData = new FormData();
  formData.append("file", {
    uri: uri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });
  formData.append("upload_preset", "CampusMarket");
  formData.append("folder", "CampusMarket");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dmzp7e6zb/image/upload",
    {
      method: "POST",
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

  const data = await res.json();
  return data.secure_url;
};

const PostItemScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "We need access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const validateForm = () => {
    if (!name.trim() || !description.trim() || !category || !type || !mode || !price || !photo) {
      Alert.alert("Missing Fields", "Please fill all fields and select a photo.");
      return false;
    }
    return true;
  };

  const addOrder = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "Please login first");
      return;
    }
    if (!validateForm()) return;
    setLoading(true);

    try {
      let photoURL = await uploadToCloudinary(photo);
      const order = {
        name: name.trim(),
        description: description.trim(),
        category,
        type,
        status: "pending",
        mode,
        price: Number(price),
        userId: currentUser.uid,
        photoURL,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "products"), order);
      Alert.alert("Success", "Product sent for admin review!");
      
      // Reset Form
      setName(""); setDescription(""); setCategory(""); setType("");
      setMode(""); setPrice(""); setPhoto(null);
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>List New Item</Text>
        <Text style={styles.headerSub}>Fill in the details to list your product</Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Calculus Textbook"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about the condition, edition, etc."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.row}>
             <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={category} onValueChange={setCategory}>
                    <Picker.Item label="Select" value="" color="#94a3b8" />
                    <Picker.Item label="Engineering" value="Engineering" />
                    <Picker.Item label="Medicine" value="Medicine" />
                    <Picker.Item label="Business" value="Business" />
                  </Picker>
                </View>
             </View>
             <View style={{flex: 1, marginLeft: 10}}>
                <Text style={styles.inputLabel}>Price (EGP)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
             </View>
          </View>

          <Text style={styles.inputLabel}>Product Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={type} onValueChange={setType}>
              <Picker.Item label="What are you selling?" value="" color="#94a3b8" />
              <Picker.Item label="Book" value="Book" />
              <Picker.Item label="Tools" value="Tools" />
            </Picker>
          </View>

          <Text style={styles.inputLabel}>Mode</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={mode} onValueChange={setMode}>
              <Picker.Item label="Select Mode" value="" color="#94a3b8" />
              <Picker.Item label="For Sale" value="For Sale" />
              <Picker.Item label="Volunteer" value="Volunteer" />
            </Picker>
          </View>

          <Text style={styles.inputLabel}>Product Photo</Text>
          <TouchableOpacity style={styles.imageSelector} onPress={pickImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.fullImage} />
            ) : (
              <View style={styles.placeholderBox}>
                <Text style={styles.plusSign}>+</Text>
                <Text style={styles.uploadText}>Upload Image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={addOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Post Product</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginTop: 10 },
  headerSub: { fontSize: 14, color: '#64748b', marginBottom: 25 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 18,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  pickerWrapper: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 18,
    overflow: 'hidden',
  },
  imageSelector: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
    borderRadius: 15,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 25,
    overflow: 'hidden'
  },
  placeholderBox: { alignItems: 'center' },
  plusSign: { fontSize: 30, color: '#94a3b8', fontWeight: '300' },
  uploadText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  fullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  submitBtn: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
});

export default PostItemScreen;