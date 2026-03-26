import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, StatusBar,
  Alert, FlatList, Image, ActivityIndicator, Dimensions, ScrollView
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 40) / 2;
const MENU_WIDTH = 280;
const isWeb = Platform.OS === "web";
export default function HomeScreen() {
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Engineering", "Medicine", "Business", "Tools"];
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (authenticatedUser) {
        const [role, name] = await Promise.all([
          AsyncStorage.getItem('userRole'),
          AsyncStorage.getItem('userName')
        ]);
        if (isMounted) {
          setUser(authenticatedUser);
          setUserRole(role);
          setUserName(name || authenticatedUser.email?.split('@')[0]);
        }
      } else {
        if (isMounted) {
          setUser(null);
          setUserRole(null);
          setUserName("");
        }
      }
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const updateData = async () => {
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('userName');
        setUserRole(role);
        setUserName(name || (auth.currentUser ? auth.currentUser.email?.split('@')[0] : ""));
      };
      updateData();
    }, [])
  );


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
    setMenuOpen(false);
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    if (screenName === "AllRequests" && userRole !== 'admin') {
      if (isWeb) {
        alert("Access Denied: Admins only");
      } else {
        Alert.alert("Access Denied", "Admins only");
      }
    } else {
      navigation.navigate(screenName);
    }
  };

  const handleLogout = async () => {
    if (isWeb) {
      if (window.confirm("Are you sure you want to logout?")) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout }
      ]
    );
  };

  const performLogout = async () => {
    try {
      setMenuOpen(false);
      await signOut(auth);
      await AsyncStorage.multiRemove(['userRole', 'userName']);
      if (!isWeb) {
        Alert.alert("Logged Out", "You are now browsing as a guest.");
      }
    } catch {
      if (isWeb) {
        alert("Failed to logout");
      } else {
        Alert.alert("Error", "Failed to logout");
      }
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.photoURL || "https://via.placeholder.com/300" }} style={styles.productImage} />
      <View style={styles.badgeContainer}>
        <View style={[styles.modeBadge, { backgroundColor: item.mode === 'For Sale' ? '#3b82f6' : '#10b981' }]}>
          <Text style={styles.modeText}>{item.mode}</Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price} EGP</Text>
        <Text style={styles.productCategoryText}>{item.category}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.topRow}>
          <Text style={styles.brandLogo}>CAMPUS<Text style={{ color: '#3b82f6' }}>.</Text></Text>
          <View style={styles.headerActions}>
            {user && <Text style={styles.welcomeUser} numberOfLines={1}>Hi, {userName}</Text>}
            <Pressable style={styles.iconCircle} onPress={() => setMenuOpen(true)}>
              <Text style={{ fontSize: 20 }}>☰</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Text style={{ marginRight: 10 }}>🔍</Text>
          <TextInput
            placeholder="Search books, tools..."
            style={styles.mainSearchInput}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 5 }}
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
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
        />
      )}

      {/* Side Menu - Dark Theme */}
      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.closeArea} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuContent}>
            <Text style={styles.menuHeader}>CAMPUS.</Text>
            <View style={styles.menuUserRole}><Text style={styles.menuRoleText}>{userRole || 'Guest'}</Text></View>

            <Pressable style={styles.menuItem} onPress={() => { handleProtectedNavigation("AddOrder") }}>
              <Text style={styles.menuItemText}>➕ Post New Item</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => { handleProtectedNavigation("MyProducts") }}>
              <Text style={styles.menuItemText}>📦 My Inventory</Text>
            </Pressable>

            {userRole === 'admin' && (
              <Pressable style={styles.menuItem} onPress={() => { handleProtectedNavigation("AllRequests") }}>
                <Text style={styles.menuItemText}>🛡️ Admin Panel</Text>
              </Pressable>
            )}

            <View style={{ flex: 1 }} />
            {user ? (
              <Pressable style={styles.logoutMenuItem} onPress={handleLogout}>
                <Text style={styles.logoutMenuText}>Sign Out</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.logoutMenuItem, { backgroundColor: '#3b82f6' }]}
                onPress={() => { setMenuOpen(false); navigation.navigate("Login") }}
              >
                <Text style={[styles.logoutMenuText, { color: '#fff' }]}>Login to your account</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  headerSection: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  brandLogo: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  welcomeUser: { fontSize: 13, color: '#64748b', marginRight: 10, maxWidth: 80 },
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
  productCard: { width: CARD_WIDTH, backgroundColor: '#fff', marginLeft: 15, marginBottom: 15, borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  productImage: { width: '100%', height: 130, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  badgeContainer: { position: 'absolute', top: 8, left: 8 },
  modeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  modeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '700' },
  productPrice: { fontSize: 14, fontWeight: '800', color: '#3b82f6', marginVertical: 2 },
  productCategoryText: { fontSize: 10, color: '#94a3b8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, flexDirection: 'row' },
  closeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuContent: { 
    width: 280, 
    backgroundColor: '#0f172a', 
    padding: 20, 
    paddingTop: 60, 
    borderTopRightRadius: 30, 
    borderBottomRightRadius: 30, 
    shadowColor: "#000", 
    shadowOffset: { width: 10, height: 0 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 15, 
    elevation: 10 
  },
  menuHeader: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 5, letterSpacing: 1 },
  menuUserRole: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 30, borderWidth: 1, borderColor: '#334155' },
  menuRoleText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 15, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  menuItemText: { fontSize: 16, color: '#cbd5e1', fontWeight: '600', marginLeft: 12 },
  logoutMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', padding: 15, borderRadius: 15, marginTop: 20, marginBottom: 30 },
  logoutMenuText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});