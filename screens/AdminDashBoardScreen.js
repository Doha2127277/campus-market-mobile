import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert,
    Platform
} from 'react-native';
import { db, auth } from "../firebase"; 
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";

const AdminDashboardScreen = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userNames, setUserNames] = useState({});
    const [isAdmin, setIsAdmin] = useState(true); 

    useEffect(() => {
        const q = query(collection(db, "products"), where("status", "==", "pending"));
        
        const unsubscribeDocs = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(data);
            setLoading(false);
        }, (error) => {
            console.error("Firebase Error: ", error);
            setLoading(false);
        });

        return () => unsubscribeDocs();
    }, []);

    useEffect(() => {
        const fetchUserNames = async () => {
            const names = { };
            let updated = false;
            for (let req of requests) {
                if (req.userId && !names[req.userId]) {
                    const userDoc = await getDoc(doc(db, "users", req.userId));
                    if (userDoc.exists()) {
                        names[req.userId] = userDoc.data().fullName;
                        updated = true;
                    }
                }
            }
            if (updated) setUserNames(names);
        };
        if (requests.length > 0) fetchUserNames();
    }, [requests]);

    const handleStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, "products", id), { status: newStatus });
            Alert.alert("Success", `Product ${newStatus} successfully!`);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not update status.");
        }
    };

    const renderRequestItem = ({ item }) => (
        <View style={styles.requestRow}>
            <View style={styles.requestInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                
                <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{item.description}</Text>
                </View>

                <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Category & Price</Text>
                    <Text style={styles.infoValue}>{item.category} • {item.price} EGP</Text>
                </View>

                <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Seller</Text>
                    <Text style={styles.infoValue}>{userNames[item.userId] || "Student User"}</Text>
                </View>
            </View>

            <View style={styles.buttonGroup}>
                <TouchableOpacity 
                    style={[styles.btn, styles.btnApprove]} 
                    onPress={() => handleStatus(item.id, "approved")}
                >
                    <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.btn, styles.btnReject]} 
                    onPress={() => handleStatus(item.id, "rejected")}
                >
                    <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.adminTitle}>Marketplace Requests</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequestItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={<Text style={styles.emptyText}>No pending requests found.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        width: '90%',
        alignSelf: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 15,
        marginBottom: 20,
    },
    adminTitle: {
        color: '#1e293b',
        fontSize: 24,
        fontWeight: '800',
    },
    listPadding: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    requestRow: {
        backgroundColor: '#ffffff',
        width: '92%',
        borderLeftWidth: 5,
        borderLeftColor: '#38bdf8',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    productName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2563eb',
        marginBottom: 10,
    },
    infoGroup: {
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '600',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 15,
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    btnApprove: { backgroundColor: '#10b981' },
    btnReject: { backgroundColor: '#ef4444' },
    btnText: { color: 'white', fontWeight: '700' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#94a3b8' }
});

export default AdminDashboardScreen;