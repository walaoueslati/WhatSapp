import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { off, onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import { db } from "../../firebase/config";

export default function UsersListScreen(props) {
  const [users, setUsers] = useState([]);
  const currentId = props.route.params?.currentId;

  useEffect(() => {
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      console.log(" Snapshot exists:", snapshot.exists());
      
      const d = [];
      snapshot.forEach((un_user) => {
        const userData = un_user.val();
        const userId = userData.id || un_user.key;
        
        if (userId !== currentId) {
          d.push({
            ...userData,
            id: userId 
          });
        }
      });
      setUsers(d);
    });

    return () => {
      off(usersRef);
    };
  }, [currentId]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Discussions</Text>

      <FlatList
        data={users}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun utilisateur disponible</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            {/* Affichage de l'image de profil ou placeholder */}
            {item.profileImage ? (
              <Image 
                source={{ uri: item.profileImage }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.name?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            
            <View style={styles.userInfo}>
              <Text style={styles.name}>{item.name || "Utilisateur"}</Text>
              <Text style={styles.phone}>{item.phone || "Pas de numéro"}</Text>
              <Text style={styles.pseudo}>
                {item.pseudo ? `@${item.pseudo}` : ""}
              </Text>
            </View>
            
            <View style={styles.iconsRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (item.phone) {
                    Alert.alert(
                      "Appel", 
                      `Appeler ${item.name || item.pseudo || "cet utilisateur"} ?`,
                      [
                        { text: "Annuler", style: "cancel" },
                        { 
                          text: "Appeler", 
                          onPress: () => {
                            // Logique d'appel ici
                            console.log(`Appel vers: ${item.phone}`);
                          }
                        }
                      ]
                    );
                  } else {
                    Alert.alert("Erreur", "Aucun numéro disponible");
                  }
                }}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={28}
                  color="#25D366"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (!item.id) {
                    console.error(" User ID is undefined:", item);
                    Alert.alert("Erreur", "Impossible d'ouvrir le chat");
                    return;
                  }
                  props.navigation.navigate("ChatScreen", {
                    currentId,
                    secondId: item.id,
                    user: item
                  });
                }}
              >
                <MaterialCommunityIcons
                  name="message-text"
                  size={28}
                  color="#25D366"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9F7EF",
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D6A4F",
    marginBottom: 20,
    textAlign: "center",
  },
  list: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: "row",
    backgroundColor: "#B7E4C7",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(45, 106, 79, 0.15)',
    } : {
      shadowColor: "#2D6A4F",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    }),
  },
  // Styles pour l'avatar image
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#40916C",
    backgroundColor: '#f0f0f0',
  },
  // Styles pour le placeholder d'avatar
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#40916C",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#2D6A4F",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4332",
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: "#2D6A4F",
    marginBottom: 2,
    fontWeight: "500",
  },
  pseudo: {
    fontSize: 13,
    color: "#40916C",
    fontStyle: "italic",
  },
  iconsRow: {
    flexDirection: "row",
    ...(Platform.OS === 'web' ? {
      columnGap: 12,
    } : {
      gap: 12,
    }),
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#2D6A44F",
    fontSize: 16,
    fontStyle: "italic",
  },
});