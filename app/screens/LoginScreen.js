import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ImageBackground,
  SafeAreaView,
  Alert,
} from "react-native";
import { signInWithEmailAndPassword } from 'firebase/auth';

import { MaterialIcons } from '@expo/vector-icons';
import { auth } from '../../firebase/config';
import { useNavigation } from '@react-navigation/native'; // <-- import this

export default function LoginScreen() {
  const navigation = useNavigation(); // <-- use hook
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const handleLogin = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

  signInWithEmailAndPassword(auth, formData.email, formData.password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log(user);
        navigation.navigate('Home'); 
      })
      .catch((error) => {
        Alert.alert('Error', error.message);
      });
  };

  const handleCreateAccount = () => {
    navigation.navigate('RegisterScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../assets/bg.jpg')}
        blurRadius={3}
        style={styles.image}
        resizeMode="cover"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry={secureTextEntry}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
            />
            <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)} style={styles.eyeIcon}>
              <MaterialIcons name={secureTextEntry ? "visibility-off" : "visibility"} size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCreateAccount} style={styles.createAccountButton}>
            <Text style={styles.createAccountText}>
              Don't have an account? <Text style={styles.createAccountTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
  },
  formContainer: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(232, 245, 233, 0.95)', 
    padding: 20,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8E6C9', 
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#2E7D32',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  loginButton: {
    backgroundColor: '#388E3C',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  createAccountText: {
    color: '#2E7D32',
    fontSize: 16,
  },
  createAccountTextBold: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
});