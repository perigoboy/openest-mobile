import React from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function Loader({ fullScreen = false, size = "large" }) {
  if (fullScreen) {
    return (
      <LinearGradient colors={['#3a0ca3', '#1e003b']} style={styles.fullScreen}>
        <View style={styles.cardContainer}>
          <BlurView intensity={40} tint="light" style={styles.blurCard}>
            <Image 
              source={require("../../assets/logo-chama.png")} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <ActivityIndicator size={size} color="#fff" style={{ marginTop: 20 }} />
          </BlurView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color="#7209b7" />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blurCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: 80,
    height: 80,
  },
  inline: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
