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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const addOrder = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "Please login first");
      navigation.replace("Login");
      return;
    }

    setLoading(true);

    try {
      let photoURL = "";
      if (photo) {
        photoURL = await uploadToCloudinary(photo);
      }

      const order = {
        name,
        description,
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
      Alert.alert("Success", "Product added successfully!");

      setName("");
      setDescription("");
      setCategory("");
      setType("");
      setMode("");
      setPrice("");
      setPhoto(null);

    } catch {
      Alert.alert("Error", "Error adding product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Product</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
              >
                <Picker.Item label="Category" value="" />
                <Picker.Item label="Engineering" value="Engineering" />
                <Picker.Item label="Medicine" value="Medicine" />
                <Picker.Item label="Business" value="Business" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={type}
                onValueChange={setType}
              >
                <Picker.Item label="Type" value="" />
                <Picker.Item label="Book" value="Book" />
                <Picker.Item label="Tools" value="Tools" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={mode}
                onValueChange={setMode}
              >
                <Picker.Item label="Mode" value="" />
                <Picker.Item label="For Sale" value="For Sale" />
                <Picker.Item label="Volunteer" value="Volunteer" />
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Price"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Add Photo of product</Text>
            
            <TouchableOpacity 
              style={styles.imagePicker} 
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.previewImage} />
              ) : (
                <Text style={styles.imagePickerText}>Choose Photo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={addOrder}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? "Adding..." : "Add Product"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    padding: 20,
    borderWidth: 2,
    borderColor: '#a50c0c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: 'black',
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#ededf2',
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 8,
    backgroundColor: '#ededf2',
    overflow: 'hidden',
  },
  label: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 5,
  },
  imagePicker: {
    width: '100%',
    height: 150,
    backgroundColor: '#ededf2',
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePickerText: {
    color: '#666',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PostItemScreen;