import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_ME_KEY = '@rememberMe'; 
const SAVED_EMAIL_KEY = '@savedEmail';
const SAVED_PASSWORD_KEY = '@savedPassword';

export default function LoginScreen(props) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false); 
  const [rememberMe, setRememberMe] = useState(true); 
  const [isLoadingSavedCredentials, setIsLoadingSavedCredentials] = useState(true);
  
  const refinput2 = useRef();

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const rememberMeValue = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        const shouldRemember = rememberMeValue !== null ? rememberMeValue === 'true' : true;
        
        setRememberMe(shouldRemember);
        
        if (shouldRemember) {
          const savedEmail = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
          const savedPassword = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);
          
          if (savedEmail) {
            setEmail(savedEmail);
          }
          if (savedPassword) {
            setPwd(savedPassword);
          }
        }
      } catch (e) {
        console.error("Failed to load saved credentials", e);
      } finally {
        setIsLoadingSavedCredentials(false);
      }
    };
    
    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email || !pwd) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
      
      if (rememberMe) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, email);
        await AsyncStorage.setItem(SAVED_PASSWORD_KEY, pwd);
      } else {
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
        await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, pwd);
      const currentId = userCredential.user.uid;
      const userRef = ref(db, `users/${currentId}`);
      await update(userRef, {
        isActive: true,
        lastSeen: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
      props.navigation.navigate("Home", { currentId });

    } catch (err) {
            if (err.code === 'auth/wrong-password' && !rememberMe) {
        setPwd('');
      }
      
    } finally {
      setLoading(false);
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
          placeholderTextColor="#888"
          editable={!loading && !isLoadingSavedCredentials}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            ref={refinput2}
            onChangeText={(text) => setPwd(text)}
            placeholder="password"
            keyboardType="default"
            secureTextEntry={!showPwd}
            style={[styles.input, styles.passwordInput]}
            value={pwd}
            placeholderTextColor="#888"
            editable={!loading && !isLoadingSavedCredentials}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => setShowPwd(!showPwd)}
            disabled={loading || isLoadingSavedCredentials}
          >
            <MaterialIcons
              name={showPwd ? "visibility" : "visibility-off"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.rememberMeContainer}>
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={() => setRememberMe(!rememberMe)}
            disabled={loading || isLoadingSavedCredentials}
          >
            <Ionicons 
              name={rememberMe ? "checkbox" : "square-outline"} 
              size={22} 
              color="#2E7D32" 
            />
          </TouchableOpacity>
          <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
        </View>

        {isLoadingSavedCredentials && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2E7D32" />
            <Text style={styles.loadingText}>Chargement des identifiants...</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginButton, loading && styles.disabledButton]}
          disabled={loading || isLoadingSavedCredentials}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>LOG IN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => props.navigation.navigate("RegisterScreen")}
          disabled={loading || isLoadingSavedCredentials}
        >
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    paddingRight: 50,
  },
  iconContainer: {
    position: 'absolute',
    right: 15,
    padding: 10,
  },
  // Styles pour Remember Me
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  checkbox: {
    paddingRight: 10,
  },
  rememberMeText: {
    fontSize: 15,
    color: '#2E7D32',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 8,
  },
  loginButton: {
    backgroundColor: '#388E3C',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#2E7D32',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    textDecorationLine: 'underline',
  },
  forgotPasswordContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});