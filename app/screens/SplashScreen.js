import React, { useEffect } from "react";
import { View, StyleSheet, ImageBackground } from "react-native";

export default function Splash({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Login"); 
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground
      source={require("../../assets/images/nabfncvpsn241.jpg")}
      style={styles.bg}
      resizeMode="cover" 
    >
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212", 
  },
});