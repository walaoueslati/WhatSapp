// ============ LoginScreen.js ============
import React, { useState, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../../firebase/config';

export default function LoginScreen(props) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const refinput2 = useRef();

  const handleLogin = async () => {
    if (!email || !pwd) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pwd);
      const currentId = userCredential.user.uid;
      
      // Navigation vers Home avec currentId
      props.navigation.navigate("Home", { currentId });
    } catch (err) {
      Alert.alert("Erreur de connexion", err.message);
    }
  };

  return (
    <LinearGradient colors={["#0B141A", "#1F2C34"]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        
        <TextInput
          onChangeText={(text) => setEmail(text)}
          onSubmitEditing={() => refinput2.current?.focus()}
          blurOnSubmit={false}
          placeholder="email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
        />
        
        <TextInput
          ref={refinput2}
          onChangeText={(text) => setPwd(text)}
          placeholder="password"
          keyboardType="default"
          secureTextEntry={true}
          style={styles.input}
          value={pwd}
        />
        
        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.buttonText}>LOG IN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => props.navigation.navigate("RegisterScreen")}>
          <Text style={styles.link}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(232, 245, 233, 0.95)', 
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32', 
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#C8E6C9',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    color: '#2E7D32',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  buttonText: {
    backgroundColor: '#388E3C',
    borderRadius: 10,
    height: 50,
    lineHeight: 50,
    textAlign: 'center',
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  link: {
    color: '#2E7D32',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

