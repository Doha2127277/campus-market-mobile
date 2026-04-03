import React, { useState } from "react";
import { View, Text, Image, StyleSheet, Button } from "react-native";

export default function ProductDetailsScreen({ route }) {
  const { product } = route.params; // المنتج كامل جاي من HomeScreen
  const [productData, setProductData] = useState(product);

  if (!productData) {
    return <Text style={styles.center}>Product not found</Text>;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: productData.photoURL || "https://via.placeholder.com/300" }}
        style={styles.image}
      />

      <Text style={styles.name}>{productData.name}</Text>
      <Text style={styles.price}>{productData.price} EGP</Text>
      <Text style={styles.desc}>{productData.description}</Text>

      <Button title="Add To Cart" onPress={() => alert("Added!")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center" },
  image: { width: 250, height: 250, resizeMode: "contain" },
  name: { fontSize: 22, fontWeight: "bold", marginTop: 10 },
  price: { fontSize: 18, color: "green", marginVertical: 10 },
  desc: { textAlign: "center" },
  center: { textAlign: "center", marginTop: 50 },
});