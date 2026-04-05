import React, { useState, useEffect, useCallback, useRef, memo } from "react"; 
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, StatusBar,
  Alert, FlatList, Image, ActivityIndicator, Dimensions, ScrollView,
  Animated, PanResponder 
} from "react-native";
import { useNavigation ,useFocusEffect} from "@react-navigation/native";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 40) / 2;
const MENU_WIDTH = 280;
const isWeb = Platform.OS === "web";


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

ProductCard.displayName = "ProductCard";

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

  const categories = ["All", "Engineering", "Medicine", "Business"];
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current; 

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
        setUserName(name || authenticatedUser.email?.split('@')[0]);
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
        const user = auth.currentUser;
        const cartKey = user ? `userCart_${user.uid}` : 'guestCart';
        const savedCart = await AsyncStorage.getItem(cartKey);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error("Error refreshing cart on focus:", e);
      }
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

  useEffect(() => {
    const q = query(collection(db, "products"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setFilteredProducts(prods);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  const filterProducts = (queryText, category) => {
    let temp = products;
    if (category !== "All") temp = temp.filter(p => p.category === category);
    if (queryText) temp = temp.filter(p => p.name?.toLowerCase().includes(queryText.toLowerCase()));
    setFilteredProducts(temp);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterProducts(text, activeCategory);
  };

  const handleProtectedNavigation = (screenName) => {
    closeMenu();
    if (!user) { navigation.navigate('Login'); return; }
    navigation.navigate(screenName);
  };

  const performLogout = async () => {
    try {
      closeMenu();
      await signOut(auth);
      await AsyncStorage.multiRemove(['userRole', 'userName']); 
      setCart([]);
      Alert.alert("Logged Out", "Come back soon!");
    } catch (e) { console.log(e); }
  };

  const handleLogout = async () => {
    if (isWeb) {
      if (window.confirm("Are you sure you want to logout?")) performLogout();
      return;
    }
    Alert.alert("Logout", "Are you sure?", [{ text: "Cancel" }, { text: "Logout", onPress: performLogout }]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.headerSection}>
        <View style={styles.topRow}>
          <Text style={styles.brandLogo}>CAMPUS<Text style={{ color: '#3b82f6' }}>.</Text></Text>
          <View style={styles.headerActions}>
            {user && <Text style={styles.welcomeUser} numberOfLines={1}>Hi, {userName}</Text>}
            
            <Pressable 
              style={[styles.iconCircle, { marginRight: 10 }]} 
              onPress={() => navigation.navigate("CartScreen", { cart, setCart })}
            >
              <MaterialCommunityIcons name="cart-outline" size={22} color="#1e293b" />
              {cart.length > 0 && (
                <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cart.length}</Text></View>
              )}
            </Pressable>

            <Pressable style={styles.iconCircle} onPress={openMenu}>
              <MaterialCommunityIcons name="menu" size={24} color="#1e293b" />
            </Pressable>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search books, tools..."
            style={styles.mainSearchInput}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard 
              item={item} 
              onPress={(prod) => navigation.navigate("ProductDetails", { product: prod })} 
              onToggleCart={toggleCart}
              isInCart={cart.some(cartItem => cartItem.id === item.id)}
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
                  <Pressable key={cat} onPress={() => { setActiveCategory(cat); filterProducts(searchQuery, cat) }}
                    style={[styles.catChip, activeCategory === cat && styles.catChipActive]}>
                    <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.sectionTitle}>Latest Items</Text>
            </>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
        />
      )}

      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.closeArea} onPress={closeMenu} />
          <Animated.View 
            {...panResponder.panHandlers}
            style={[styles.menuContent, { transform: [{ translateX: slideAnim }] }]}
          >
            <Text style={styles.menuHeader}>CAMPUS.</Text>
            <View style={styles.menuUserRole}><Text style={styles.menuRoleText}>{userRole || 'Guest'}</Text></View>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("AddOrder")}>
              <Text style={styles.menuItemText}>➕ Post New Item</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("MyProducts")}>
              <Text style={styles.menuItemText}>📦 My Inventory</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("MyRequests")}>
              <Text style={styles.menuItemText}>📄 My Requests</Text>
            </Pressable>
            {userRole === 'admin' && (
              <Pressable style={styles.menuItem} onPress={() => handleProtectedNavigation("AllRequests")}>
                <Text style={styles.menuItemText}>🛡️ Admin Panel</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            {user ? (
              <Pressable style={styles.logoutMenuItem} onPress={handleLogout}>
                <Text style={styles.logoutMenuText}>Sign Out</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.logoutMenuItem, { backgroundColor: '#3b82f6' }]}
                onPress={() => { closeMenu(); navigation.navigate("Login") }}>
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
  welcomeUser: { fontSize: 12, color: '#64748b', marginRight: 8, maxWidth: 70 },
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
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, flexDirection: 'row' },
  closeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuContent: { width: MENU_WIDTH, backgroundColor: '#0f172a', padding: 20, paddingTop: 60, position: 'absolute', right: 0, top: 0, bottom: 0 },
  menuHeader: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 5 },
  menuUserRole: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 30 },
  menuRoleText: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#334155' },
  menuItemText: { fontSize: 16, color: '#f1f5f9', fontWeight: '500' },
  logoutMenuItem: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 4, marginTop: 20 },
  logoutMenuText: { color: '#f87171', fontWeight: 'bold', textAlign: 'center' }
});