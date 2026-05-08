import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, StatusBar,
  Alert, FlatList, Image, ActivityIndicator, Dimensions, ScrollView,
  Animated, Modal, PanResponder
} from "react-native";
import Fuse from "fuse.js"; 
import debounce from "lodash/debounce";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut, updatePassword, updateProfile } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 40) / 2;
const MENU_WIDTH = 280;
const isWeb = Platform.OS === "web";

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
const ProductCard = memo(function ProductCard({ item, onPress, onToggleCart, isInCart, currentUserId }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();

  const displayRating = item.sellerRating || item.rating || 0;
  const displayReviews = item.totalReviews || 0;
  const isSold = item.itemStatus === "sold";
const isOwner =
  currentUserId &&
  (item.userId === currentUserId || item.sellerId === currentUserId);
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
          
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingValue}>{displayRating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({displayReviews})</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {item.price} <Text style={styles.currencyText}>EGP</Text>
            </Text>
          </View>
          {!isOwner && (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 5 }}>
    <Pressable
      style={[styles.cartSmallBtn, isInCart && styles.cartActiveFill]}
      onPress={() => onToggleCart(item)}
    >
      <MaterialCommunityIcons
        name={isInCart ? "cart-check" : "cart-plus"}
        size={20}
        color={isInCart ? "#fff" : "#10b981"}
      />
    </Pressable>

    <Pressable style={styles.detailsButton} onPress={() => onPress(item)}>
      <Text style={styles.detailsButtonText}>Details</Text>
    </Pressable>
  </View>
)}
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
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

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
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem("searchHistory");
      if (history) setSearchHistory(JSON.parse(history));
    } catch (e) { console.log(e); }
  };

  const saveSearch = async (q) => {
    if (!q.trim()) return;
    const updated = [q, ...searchHistory.filter(i => i.toLowerCase() !== q.toLowerCase())].slice(0, 10);
    setSearchHistory(updated);
    try { await AsyncStorage.setItem("searchHistory", JSON.stringify(updated)); } catch (e) { console.log(e); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (authenticatedUser) {
        const [role, name, userCartData, guestCartData] = await Promise.all([
          AsyncStorage.getItem('userRole'),
          AsyncStorage.getItem('userName'),
          AsyncStorage.getItem(`userCart_${authenticatedUser.uid}`),
          AsyncStorage.getItem('guestCart')
        ]);

        let finalCart = userCartData ? JSON.parse(userCartData) : [];
        if (guestCartData) {
          const guestItems = JSON.parse(guestCartData);
          guestItems.forEach(item => {
            if (!finalCart.find(i => i.id === item.id)) finalCart.push(item);
          });
          await AsyncStorage.removeItem('guestCart');
          await AsyncStorage.setItem(`userCart_${authenticatedUser.uid}`, JSON.stringify(finalCart));
        }
        setUser(authenticatedUser);
        setCart(finalCart);
        setUserRole(role);
        const displayName = name || authenticatedUser.email?.split('@')[0];
        setUserName(displayName);
        setNewUserName(displayName);
        setSelectedImage(authenticatedUser.photoURL);
      } else {
        const guestCartData = await AsyncStorage.getItem('guestCart');
        setUser(null);
        setUserRole(null);
        setUserName("");
        setCart(guestCartData ? JSON.parse(guestCartData) : []);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saveCart = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(`userCart_${user.uid}`, JSON.stringify(cart));
        } else if (!user && !loading) {
          await AsyncStorage.setItem('guestCart', JSON.stringify(cart));
        }
      } catch (e) { console.error(e); }
    };
    saveCart();
  }, [cart, user, loading]);

  useFocusEffect(
    useCallback(() => {
      const refreshCart = async () => {
        try {
          const currentUser = auth.currentUser;
          const cartKey = currentUser ? `userCart_${currentUser.uid}` : 'guestCart';
          const savedCart = await AsyncStorage.getItem(cartKey);
          if (savedCart) setCart(JSON.parse(savedCart));
        } catch (e) { console.error(e); }
      };
      refreshCart();
    }, [])
  );

  const toggleCart = (product) => {
    const isExist = cart.find(item => item.id === product.id);
    if (isExist) {
      setCart(cart.filter(item => item.id !== product.id));
    } else {
      setCart([...cart, product]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const productsQuery = query(collection(db, "products"), where("status", "==", "approved"));
    
    const unsubscribeProducts = onSnapshot(productsQuery, async (productsSnapshot) => {
      if (!isMounted) return;
      
      let productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // التعديل هنا: فلترة المنتجات المبيعة تماماً من الشاشة الرئيسية
      productsList = productsList.filter(p => p.itemStatus !== "sold");
      
      const sellerIds = [...new Set(productsList.map(p => p.sellerId).filter(id => id && id !== "unknown"))];
      const ratingsMap = {};
      
      await Promise.all(sellerIds.map(async (sellerId) => {
        const sellerRef = doc(db, "users", sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          const sellerData = sellerSnap.data();
          ratingsMap[sellerId] = {
            rating: sellerData.rating || 0,
            totalReviews: sellerData.totalReviews || 0
          };
        }
      }));
      
      const finalProducts = productsList.map(product => ({
        ...product,
        sellerRating: ratingsMap[product.sellerId]?.rating || 0,
        totalReviews: ratingsMap[product.sellerId]?.totalReviews || 0
      }));
      
      if (isMounted) {
        setProducts(finalProducts);
        setFilteredProducts(finalProducts);
        setLoading(false);
      }
    });
    
    return () => { isMounted = false; unsubscribeProducts(); };
  }, []);

  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: ["name", "category", "description", "tags"],
      threshold: 0.35,
      includeScore: true,
    });
  }, [products]);

  const applySearch = useCallback((text, category) => {
    let results = products;
    if (text.trim()) results = fuse.search(text).map(r => r.item);
    if (category !== "All") results = results.filter(p => p.category === category);
    setFilteredProducts(results);
  }, [products, fuse]);

  const generateSuggestions = (text) => {
    if (!text.trim()) { setSuggestions(searchHistory); return; }
    const results = fuse.search(text).slice(0, 5).map(r => r.item.name);
    const historyMatches = searchHistory.filter(i => i.toLowerCase().includes(text.toLowerCase()));
    setSuggestions([...new Set([...historyMatches, ...results])].slice(0, 6));
  };

  const debouncedSearch = useCallback(
    debounce((text, category) => {
      applySearch(text, category);
      generateSuggestions(text);
    }, 250),
    [applySearch, searchHistory]
  );

  const handleSearch = (text) => {
    setSearchQuery(text);
    debouncedSearch(text, activeCategory);
  };

  const handleSuggestionPress = (item) => {
    setSearchQuery(item);
    saveSearch(item);
    applySearch(item, activeCategory);
    setSuggestions([]);
  };

  useEffect(() => {
    applySearch(searchQuery, activeCategory);
  }, [activeCategory, applySearch, searchQuery]);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: MENU_WIDTH, duration: 250, useNativeDriver: true }).start(() => setMenuOpen(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => menuOpen && gestureState.dx > 10,
      onPanResponderMove: (_, gestureState) => {
        let newX = Math.max(0, Math.min(MENU_WIDTH, gestureState.dx));
        slideAnim.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50 || gestureState.vx > 0.5) closeMenu();
        else openMenu();
      },
    })
  ).current;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert("Permission Required", "Need gallery access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setTempImage(result.assets[0].uri);
  };

  const handleUpdateProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) { Alert.alert("Error", "Passwords do not match"); return; }
    setUpdating(true);
    try {
      const userRef = doc(db, "users", user.uid);
      let updateData = { fullName: newUserName };
      let newPhotoURL = null;
      if (tempImage) { newPhotoURL = await uploadToCloudinary(tempImage); updateData.photoURL = newPhotoURL; }
      await updateDoc(userRef, updateData);
      if (newPhotoURL || newUserName) {
        await updateProfile(auth.currentUser, { photoURL: newPhotoURL, displayName: newUserName });
      }
      if (newPassword) await updatePassword(auth.currentUser, newPassword);
      Alert.alert("Success", "Profile updated! Please login again.", [
        { text: "OK", onPress: async () => {
            setProfileModalVisible(false);
            await signOut(auth);
            await AsyncStorage.multiRemove(['userRole', 'userName']);
            navigation.navigate("Login");
        }}
      ]);
    } catch (error) { Alert.alert("Error", error.message); } finally { setUpdating(false); }
  };

  const performLogout = async () => {
    try {
      closeMenu();
      await signOut(auth);
      await AsyncStorage.multiRemove(['userRole', 'userName']);
      setCart([]);
    } catch (e) { console.log(e); }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [{ text: "Cancel" }, { text: "Logout", onPress: performLogout }]);
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
            <Pressable style={[styles.iconCircle, { marginRight: 10 }]} onPress={() => navigation.navigate("CartScreen", { cart, setCart })}>
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
          <TextInput placeholder="Search books, tools..." style={styles.mainSearchInput} value={searchQuery} onChangeText={handleSearch} />
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item, index) => (
              <Pressable key={index} style={styles.suggestionItem} onPress={() => handleSuggestionPress(item)}>
                <MaterialCommunityIcons name="magnify" size={18} color="#64748b" />
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
  item={item}
  onPress={(prod) => navigation.navigate("ProductDetails", { product: prod })}
  onToggleCart={toggleCart}
  isInCart={cart.some(cartItem => cartItem.id === item.id)}
  currentUserId={user?.uid}
/>
        )}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 5 }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
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
                <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[styles.catChip, activeCategory === cat && styles.catChipActive]}>
                  <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionTitle}>Latest Items</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
      />

      <Modal visible={profileModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setProfileModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color="#64748b" /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable style={styles.avatarPicker} onPress={pickImage}>
                <Image source={{ uri: tempImage || selectedImage || "https://via.placeholder.com/150" }} style={styles.avatarLarge} />
                <View style={styles.avatarEditIcon}><MaterialCommunityIcons name="camera" size={16} color="#fff" /></View>
              </Pressable>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput style={styles.profileInput} value={newUserName} onChangeText={setNewUserName} />
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput style={styles.profileInputFlex} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} />
                <Pressable onPress={() => setShowPassword(!showPassword)}><MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={22} color="#64748b" /></Pressable>
              </View>
            </ScrollView>
            <View style={styles.profileModalActions}>
              <Pressable style={styles.profileSaveBtn} onPress={handleUpdateProfile} disabled={updating}>
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.profileSaveText}>Save Changes</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.closeArea} onPress={closeMenu} />
          <Animated.View {...panResponder.panHandlers} style={[styles.menuContent, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.menuHeader}>CAMPUS.</Text>
            <View style={styles.menuUserRole}><Text style={styles.menuRoleText}>{userRole || 'Guest'}</Text></View>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("AddOrder")}><Text style={styles.menuItemText}>➕ Post New Item</Text></Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("MyProducts")}><Text style={styles.menuItemText}>📦 My Inventory</Text></Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("SellerOrders")}><Text style={styles.menuItemText}>💰 Incoming Orders</Text></Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("MyRequests")}><Text style={styles.menuItemText}>📄 My Orders</Text></Pressable>
            {userRole === 'admin' && (
              <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("AllRequests")}><Text style={styles.menuItemText}>🛡️ Admin Panel</Text></Pressable>
            )}
            <View style={{ flex: 1 }} />
            {user ? (
              <Pressable style={styles.logoutMenuItem} onPress={handleLogout}><Text style={styles.logoutMenuText}>Sign Out</Text></Pressable>
            ) : (
              <Pressable style={[styles.logoutMenuItem, { backgroundColor: '#3b82f6' }]} onPress={() => { closeMenu(); navigation.navigate("Login") }}>
                <Text style={[styles.logoutMenuText, { color: '#fff' }]}>Login</Text>
              </Pressable>
            )}
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  ratingValue: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  ratingCount: { fontSize: 10, color: '#94a3b8' },
  priceRow: { marginBottom: 10 },
  productPrice: { fontSize: 17, fontWeight: '900', color: '#2563eb' },
  currencyText: { fontSize: 10, color: '#64748b' },
  detailsButton: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  detailsButtonText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  cartSmallBtn: { width: 45, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  cartActiveFill: { backgroundColor: '#10b981' },
  cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ef4444', borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  badgeContainer: { position: 'absolute', top: 8, left: 8 },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, flexDirection: 'row' },
  closeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuContent: { width: MENU_WIDTH, backgroundColor: '#0f172a', padding: 20, paddingTop: 60, position: 'absolute', right: 0, top: 0, bottom: 0 },
  menuHeader: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 5 },
  menuUserRole: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 30 },
  menuRoleText: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
  menuItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  menuItemText: { color: '#fff', fontSize: 16 },
  logoutMenuItem: { marginTop: 20, padding: 15, borderRadius: 10, backgroundColor: '#ef4444' },
  logoutMenuText: { textAlign: 'center', fontWeight: 'bold', color: '#fff' },
  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 15, marginTop: 5, elevation: 5 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionText: { marginLeft: 10, color: '#475569' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  profileModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '90%' },
  profileModalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  profileModalTitle: { fontSize: 20, fontWeight: 'bold' },
  avatarPicker: { alignSelf: 'center', marginBottom: 20 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50 },
  avatarEditIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', p: 5, borderRadius: 15, padding: 5 },
  inputLabel: { fontSize: 14, color: '#64748b', marginBottom: 5 },
  profileInput: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, marginBottom: 15 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingRight: 10, marginBottom: 15 },
  profileInputFlex: { flex: 1, padding: 12 },
  profileSaveBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 12, alignItems: 'center' },
  profileSaveText: { color: '#fff', fontWeight: 'bold' },
});