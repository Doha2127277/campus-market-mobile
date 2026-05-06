import React, { useState, useEffect, useCallback, useRef, memo } from "react"; 
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, StatusBar,
  Alert, FlatList, Image, ActivityIndicator, Dimensions, ScrollView,
  Animated, Modal
} from "react-native";
import { onAuthStateChanged, signOut, updatePassword, updateProfile } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../services/firebase"; 
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 40) / 2;
const MENU_WIDTH = 280;

// --- وظيفة الرفع لـ Cloudinary ---
const uploadToCloudinary = async (uri) => {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri: uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    formData.append("upload_preset", "CampusMarket");
    formData.append("folder", "CampusMarket/Profiles");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dmzp7e6zb/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Error:", error);
    throw error;
  }
};

const ProductCard = memo(({ item, onPress, onToggleCart, isInCart }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={() => onPress(item)}>
      <Animated.View style={[styles.productCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.photoURL || "https://via.placeholder.com/300" }} style={styles.productImage} resizeMode="cover" />
          <View style={styles.badgeContainer}>
            <View style={[styles.modeBadge, { backgroundColor: item.mode === 'For Sale' ? '#47d40e' : '#c01b1b' }]}>
              <Text style={styles.modeText}>{item.mode === 'For Sale' ? '💰 Sale' : '🤝 FREE'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productCategoryText}>{item.category}</Text>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{item.price} <Text style={styles.currencyText}>EGP</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 5 }}>
            <Pressable style={[styles.cartSmallBtn, isInCart && styles.cartActiveFill]} onPress={() => onToggleCart(item)}>
              <MaterialCommunityIcons name={isInCart ? "cart-check" : "cart-plus"} size={20} color={isInCart ? "#fff" : "#10b981"} />
            </Pressable>
            <Pressable style={styles.detailsButton} onPress={() => onPress(item)}>
              <Text style={styles.detailsButtonText}>Details</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]); 

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [tempImage, setTempImage] = useState(null); 
  const [updating, setUpdating] = useState(false);

  const categories = ["All", "Engineering", "Medicine", "Business"];
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (authenticatedUser) {
       const [role, name] = await Promise.all([
  AsyncStorage.getItem('userRole'),
  AsyncStorage.getItem('userName')
]);
        setUser(authenticatedUser);
        setUserRole(role);
        setUserName(name || authenticatedUser.email?.split('@')[0]);
        setNewUserName(name || authenticatedUser.email?.split('@')[0]);
        setSelectedImage(authenticatedUser.photoURL);
        const userCartData = await AsyncStorage.getItem(`userCart_${authenticatedUser.uid}`);
        if (userCartData) setCart(JSON.parse(userCartData));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setFilteredProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  const toggleCart = (product) => {
    const isExist = cart.find(item => item.id === product.id);
    const newCart = isExist ? cart.filter(item => item.id !== product.id) : [...cart, product];
    setCart(newCart);
    if (user) AsyncStorage.setItem(`userCart_${user.uid}`, JSON.stringify(newCart));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "We need access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setTempImage(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    setUpdating(true);
    try {
      const userRef = doc(db, "users", user.uid);
      let updateData = { fullName: newUserName };
      let newPhotoURL = null;

      if (tempImage) {
        newPhotoURL = await uploadToCloudinary(tempImage);
        updateData.photoURL = newPhotoURL;
      }

      await updateDoc(userRef, updateData);
if (newPhotoURL || newUserName) {
  await updateProfile(auth.currentUser, {
    photoURL: newPhotoURL,
    displayName: newUserName
  });
}
      if (newPassword) {
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch (passwordError) {
          if (passwordError.code === 'auth/requires-recent-login') {
            Alert.alert("Re-authentication Required", "Please login again before updating password.");
            setUpdating(false);
            return;
          }
          throw passwordError;
        }
      }

      // الـ Alert المطلوب بعد النجاح
      Alert.alert(
        "Update Successful",
        "Your profile has been updated successfully! Please login again to see the changes.",
        [
          { 
            text: "OK", 
            onPress: async () => {
              setProfileModalVisible(false);
              await signOut(auth);
              // مسح الداتا القديمة عشان لما يدخل يشوف الصورة الجديدة
              await AsyncStorage.multiRemove(['userRole', 'userName', 'userPhoto']);
              navigation.replace("Login");
            } 
          }
        ]
      );
      
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update profile: " + (error.message || ""));
    } finally {
      setUpdating(false);
    }
  };

  const cancelUpdate = () => {
    setNewUserName(userName);
    setTempImage(null);
    setNewPassword("");
    setConfirmPassword("");
    setProfileModalVisible(false);
  };

  const performLogout = async () => {
    try {
      closeMenu();
      await signOut(auth);
      await AsyncStorage.multiRemove(['userRole', 'userName']);
      navigation.replace("Login");
    } catch (e) { console.log(e); }
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: MENU_WIDTH, duration: 250, useNativeDriver: true }).start(() => setMenuOpen(false));
  };

  const filterProducts = (queryText, category) => {
    let temp = products;
    if (category !== "All") temp = temp.filter(p => p.category === category);
    if (queryText) temp = temp.filter(p => p.name?.toLowerCase().includes(queryText.toLowerCase()));
    setFilteredProducts(temp);
  };

  const handleProtectedNavigation = (screenName) => {
    closeMenu();
    if (!user) { navigation.navigate('Login'); return; }
    navigation.navigate(screenName);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.headerSection}>
        <View style={styles.topRow}>
          <Text style={styles.brandLogo}>CAMPUS<Text style={{ color: '#3b82f6' }}>.</Text></Text>
          <View style={styles.headerActions}>
            {user && (
              <Pressable style={styles.profileTrigger} onPress={() => setProfileModalVisible(true)}>
                <Text style={styles.welcomeUser} numberOfLines={1}>Hi, {userName}</Text>
                <Image source={{ uri: selectedImage || user?.photoURL || "https://via.placeholder.com/100" }} style={styles.avatarMini} />
              </Pressable>
            )}
            <Pressable style={[styles.iconCircle, { marginRight: 10 }]} onPress={() => navigation.navigate("CartScreen", { cart })}>
              <MaterialCommunityIcons name="cart-outline" size={22} color="#1e293b" />
              {cart.length > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cart.length}</Text></View>}
            </Pressable>
            <Pressable style={styles.iconCircle} onPress={openMenu}>
              <MaterialCommunityIcons name="menu" size={24} color="#1e293b" />
            </Pressable>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={{ marginRight: 10 }} />
          <TextInput placeholder="Search books, tools..." style={styles.mainSearchInput} value={searchQuery} onChangeText={(t) => { setSearchQuery(t); filterProducts(t, activeCategory) }} />
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard item={item} onPress={(prod) => navigation.navigate("ProductDetails", { product: prod })} onToggleCart={toggleCart} isInCart={cart.some(c => c.id === item.id)} />
        )}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 5 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Student Market</Text>
                <Text style={styles.heroSub}>Buy and sell with your peers safely.</Text>
              </View>
              <Text style={{ fontSize: 40 }}>🎓</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {categories.map(cat => (
                <Pressable key={cat} onPress={() => { setActiveCategory(cat); filterProducts(searchQuery, cat) }} style={[styles.catChip, activeCategory === cat && styles.catChipActive]}>
                  <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionTitle}>Latest Items</Text>
          </>
        }
      />

      <Modal visible={profileModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.profileCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={styles.imagePickerContainer}>
              <Image source={{ uri: tempImage || selectedImage || user?.photoURL || "https://via.placeholder.com/100" }} style={styles.largeAvatar} />
              <Pressable style={styles.cameraIcon} onPress={pickImage}><MaterialCommunityIcons name="camera" size={18} color="#fff" /></Pressable>
            </View>
            <TextInput placeholder="Name" style={styles.modalInput} value={newUserName} onChangeText={setNewUserName} />
            <View style={styles.passInputContainer}>
              <TextInput placeholder="New Password" secureTextEntry={!showPassword} style={{ flex: 1 }} value={newPassword} onChangeText={setNewPassword} />
              <Pressable onPress={() => setShowPassword(!showPassword)}><MaterialCommunityIcons name={showPassword ? "eye" : "eye-off"} size={20} color="#64748b" /></Pressable>
            </View>
            <View style={[styles.passInputContainer, newPassword !== confirmPassword && confirmPassword.length > 0 && { borderColor: '#ef4444' }]}>
              <TextInput placeholder="Confirm Password" secureTextEntry={!showConfirmPassword} style={{ flex: 1 }} value={confirmPassword} onChangeText={setConfirmPassword} />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}><MaterialCommunityIcons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#64748b" /></Pressable>
            </View>
            {newPassword !== confirmPassword && confirmPassword.length > 0 && <Text style={styles.errorText}>Not match</Text>}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#94a3b8' }]} onPress={cancelUpdate}><Text style={styles.btnText}>Cancel</Text></Pressable>
              <Pressable style={styles.modalBtn} onPress={handleUpdateProfile} disabled={updating}>{updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirm</Text>}</Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.closeArea} onPress={closeMenu} />
          <Animated.View style={[styles.menuContent, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.menuHeader}>CAMPUS.</Text>
            <View style={styles.menuUserRole}><Text style={styles.menuRoleText}>{userRole || 'Guest'}</Text></View>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("AddOrder")}>
              <Text style={styles.menuItemText}>➕ Post New Item</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("MyProducts")}>
              <Text style={styles.menuItemText}>📦 My Inventory</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("SellerOrders")}>
              <Text style={styles.menuItemText}>💰 Incoming Orders</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("MyRequests")}>
              <Text style={styles.menuItemText}>📄 My Orders</Text>
            </Pressable>
            {userRole === 'admin' && (
              <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("AllRequests")}>
                <Text style={styles.menuItemText}>🛡️ Admin Panel</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable style={styles.logoutMenuItem} onPress={performLogout}>
              <Text style={styles.logoutMenuText}>Sign Out</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  headerSection: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  brandLogo: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  profileTrigger: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  welcomeUser: { fontSize: 12, color: '#64748b', marginRight: 8, maxWidth: 70 },
  avatarMini: { width: 35, height: 35, borderRadius: 17.5, borderWidth: 1.5, borderColor: '#3b82f6' },
  iconCircle: { width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 25, paddingHorizontal: 15, height: 45 },
  mainSearchInput: { flex: 1, fontSize: 14 },
  heroCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 20, marginHorizontal: 15, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#94a3b8', fontSize: 12, marginTop: 5 },
  catScroll: { paddingLeft: 15, marginVertical: 15 },
  catChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10 },
  catChipActive: { backgroundColor: '#3b82f6' },
  catText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginLeft: 20, marginBottom: 10 },
  productCard: { width: CARD_WIDTH, backgroundColor: '#ffffff', marginLeft: 15, marginBottom: 20, borderRadius: 20, elevation: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  imageContainer: { width: '100%', height: 130, backgroundColor: '#f8fafc' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 12 },
  productCategoryText: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  priceRow: { marginBottom: 10 },
  productPrice: { fontSize: 17, fontWeight: '900', color: '#2563eb' },
  currencyText: { fontSize: 10, color: '#64748b' },
  detailsButton: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  detailsButtonText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  cartSmallBtn: { width: 45, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: '#10b981', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  cartActiveFill: { backgroundColor: '#10b981' },
  cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ef4444', borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  badgeContainer: { position: 'absolute', top: 8, left: 8 },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  profileCard: { width: '85%', backgroundColor: '#fff', borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  imagePickerContainer: { alignItems: 'center', marginBottom: 20, position: 'relative' },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9' },
  cameraIcon: { position: 'absolute', bottom: 0, right: '35%', backgroundColor: '#3b82f6', padding: 6, borderRadius: 15 },
  modalInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 15 },
  passInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10, height: 50 },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalBtn: { flex: 0.47, backgroundColor: '#3b82f6', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, flexDirection: 'row' },
  closeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuContent: { width: MENU_WIDTH, backgroundColor: '#0f172a', padding: 20, paddingTop: 60, position: 'absolute', right: 0, top: 0, bottom: 0 },
  menuHeader: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 5 },
  menuUserRole: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 30 },
  menuRoleText: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
  menuItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#334155' },
  menuItemText: { fontSize: 16, color: '#f1f5f9' },
  logoutMenuItem: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 4, marginTop: 20 },
  logoutMenuText: { color: '#f87171', fontWeight: 'bold', textAlign: 'center' }
});