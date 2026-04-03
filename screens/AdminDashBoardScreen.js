import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Image
} from 'react-native';
import { db, auth } from "../services/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";

const AdminDashboardScreen = ({ navigation }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userNames, setUserNames] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().role === "admin") {
                        setIsAdmin(true);
                    }
                } catch (e) { console.log(e); }
            }
            setVerifying(false);
        };

        const unsubscribeAuth = auth.onAuthStateChanged(checkAdminStatus);

        const q = query(collection(db, "products"), where("status", "==", "pending"));
        const unsubscribeDocs = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(data);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeDocs();
        };
    }, []);

    useEffect(() => {
        const fetchUserNames = async () => {
            const names = { ...userNames };
            for (let req of requests) {
                if (req.userId && !names[req.userId]) {
                    const userDoc = await getDoc(doc(db, "users", req.userId));
                    if (userDoc.exists()) {
                        names[req.userId] = userDoc.data().fullName;
                    }
                }
            }
            setUserNames(names);
        };
        if (requests.length > 0) fetchUserNames();
    }, [requests]);

    const handleStatus = async (id, newStatus) => {
        if (newStatus === "rejected") {
            Alert.alert(
                "Confirm Rejection",
                "Are you sure you want to reject this product?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Reject",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await updateDoc(doc(db, "products", id), { status: "rejected" });
                            } catch {
                                Alert.alert("Error", "Action failed");
                            }
                        }
                    }]
            );
        } else {
            try {
                await updateDoc(doc(db, "products", id), { status: "approved" });
            } catch {
                Alert.alert("Error", "Action failed");
            }
        }
    };

    if (verifying) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Text style={styles.deniedText}>Access Denied</Text>
                <Text>Administrators Only</Text>
            </View>
        );
    }

    const renderRequestItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.requestRow} 
            onPress={() => navigation.navigate("ProductDetails", { id: item.id })}
        >
            <Image
                source={{ uri: item.photoURL || 'https://via.placeholder.com/150' }}
                style={styles.productImage}
            />

            <View style={styles.requestInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Seller</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{userNames[item.userId] || "..."}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Price</Text>
                        <Text style={[styles.infoValue, { color: '#10b981' }]}>{item.price} EGP</Text>
                    </View>
                </View>

                <View style={styles.descBox}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                </View>
            </View>

            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.btnApprove]}
                    onPress={() => handleStatus(item.id, "approved")}
                >
                    <Text style={styles.btnText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.btnReject]}
                    onPress={() => handleStatus(item.id, "rejected")}
                >
                    <Text style={styles.btnText}>✕</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.adminTitle}>Marketplace Requests</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{requests.length}</Text></View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequestItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={<Text style={styles.emptyText}>All caught up! No pending requests.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'ios' ? 60 : 30 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 10
    },
    adminTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    badge: { backgroundColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    listPadding: { paddingHorizontal: 15, paddingBottom: 40 },
    requestRow: {
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderLeftWidth: 5,
        borderLeftColor: '#38bdf8',
    },
    productImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: '#f1f5f9'
    },
    requestInfo: {
        flex: 1,
        paddingHorizontal: 15,
    },
    productName: { fontSize: 17, fontWeight: '700', color: '#2563eb', marginBottom: 5 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
    infoValue: { fontSize: 13, color: '#334155', fontWeight: '600' },
    descBox: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 5 },
    descText: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
    buttonGroup: {
        gap: 10,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2
    },
    btnApprove: { backgroundColor: '#10b981' },
    btnReject: { backgroundColor: '#ef4444' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    deniedText: { color: '#ef4444', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    emptyText: { textAlign: 'center', marginTop: 100, color: '#94a3b8', fontSize: 16 }
});

export default AdminDashboardScreen;
