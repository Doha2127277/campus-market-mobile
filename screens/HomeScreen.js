import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  Alert
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { auth } from "../services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const isWeb = Platform.OS === "web";

export default function HomeScreen() {
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (authenticatedUser) {
        setUser(authenticatedUser);
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('userName');
        console.log("Current User Role:", role);
        setUserRole(role);
        setUserName(name || authenticatedUser.email?.split('@')[0]);
      } else {
        setUser(null);
        setUserRole(null);
        setUserName("");
      }
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const updateUserData = async () => {
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('userName');
        setUserRole(role);
        setUserName(name || (auth.currentUser ? auth.currentUser.email?.split('@')[0] : ""));
      };
      updateUserData();
    }, [])
  );

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
      await signOut(auth);
      await AsyncStorage.multiRemove(['userRole', 'userName']);
      setMenuOpen(false);
    } catch {
      if (isWeb) {
        alert("Failed to logout");
      } else {
        Alert.alert("Error", "Failed to logout");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.mainWrapper}>
        <ScrollView style={styles.container} bounces={false}>
          <View style={styles.navbar}>
            <View style={styles.navContent}>
              <View style={styles.navLeft}>
                <Text style={styles.logo}>CAMPUS.</Text>
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    placeholder="Search"
                    placeholderTextColor="#94a3b8"
                    style={styles.searchInput}
                  />
                </View>
              </View>

              <View style={styles.navRight}>
                {!user ? (
                  <Pressable
                    style={styles.loginBtn}
                    onPress={() => navigation.navigate("Login")}
                  >
                    <Text style={styles.loginText}>Sign In</Text>
                  </Pressable>
                ) : (
                  <>
                    <Text style={styles.userNameText} numberOfLines={1}>
                      Hi, {userName}
                    </Text>
                    <Pressable
                      style={styles.logoutBtn}
                      onPress={handleLogout}
                    >
                      <Text style={styles.logoutText}>Logout</Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  style={styles.menuBtn}
                  onPress={() => setMenuOpen(!menuOpen)}
                >
                  <Text style={styles.menuIconText}>
                    {menuOpen ? "✕" : "☰"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Welcome to Campus Market</Text>
            <Text style={styles.heroSubtitle}>
              The most trusted marketplace to buy and sell textbooks, electronics,
              and student essentials within your university community.
            </Text>
          </View>
        </ScrollView>

        {menuOpen && (
          <>
            <Pressable 
              style={styles.outsideOverlay} 
              onPress={() => setMenuOpen(false)} 
            />
            <View style={styles.dropdownOverlay}>
              <View style={styles.dropdownCard}>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>Role: {userRole || 'Guest'}</Text>
                </View>

                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => handleProtectedNavigation("MyProducts")}
                >
                  <Text style={styles.dropdownText}>📦 My Inventory</Text>
                </Pressable>

                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => handleProtectedNavigation("AddOrder")}
                >
                  <Text style={styles.dropdownText}>➕ Post Item</Text>
                </Pressable>

                {userRole === 'admin' && (
                  <Pressable
                    style={[styles.dropdownItem, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setMenuOpen(false);
                      navigation.navigate("AllRequests");
                    }}
                  >
                    <Text style={styles.dropdownText}>📋 Admin Dashboard</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1e293b",
  },
  mainWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
  },
  container: {
    flex: 1,
  },
  navbar: {
    backgroundColor: "#1e293b",
    paddingVertical: isWeb ? 15 : 10,
    zIndex: 20,
  },
  navContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    color: "#38bdf8",
    fontSize: isWeb ? 24 : 20,
    fontWeight: "bold",
    marginRight: 12,
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    maxWidth: isWeb ? 300 : 160,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  searchInput: {
    color: "white",
    fontSize: 14,
    flex: 1,
    padding: 0,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  loginBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
  },
  loginText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  menuBtn: {
    backgroundColor: "#10b981",
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  userNameText: {
    color: "white",
    fontWeight: "500",
    fontSize: 14,
    marginRight: 10,
    maxWidth: 100,
  },
  outsideOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  dropdownOverlay: {
    position: "absolute",
    top: isWeb ? 70 : 60,
    right: 15,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    width: 200,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  roleTag: {
    padding: 10,
    backgroundColor: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#475569'
  },
  roleTagText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  dropdownText: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "500",
  },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 50,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  heroTitle: {
    fontSize: isWeb ? 42 : 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 15,
  },
  heroSubtitle: {
    fontSize: isWeb ? 18 : 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 600,
  }
});