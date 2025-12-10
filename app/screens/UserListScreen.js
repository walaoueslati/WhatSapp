import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { off, onValue, ref } from "firebase/database";
import React, { useEffect, useState, useMemo } from "react";
import { 
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  TextInput, 
} from "react-native";
import { db } from "../../firebase/config";

export default function UsersListScreen(props) {
  const [usersFromDB, setUsersFromDB] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const currentId = props.route.params?.currentId;

  useEffect(() => {
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      console.log("Snapshot exists:", snapshot.exists());
      
      const allUsers = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((userSnapshot) => {
          const userData = userSnapshot.val();
          const userId = userSnapshot.key; 
          
          if (userId !== currentId) {
            allUsers.push({
              ...userData,
              id: userId,
              isOnline: userData.isActive === true 
            });
          }
        });
      }
      
      allUsers.sort((a, b) => (b.isOnline - a.isOnline));
      
      setUsersFromDB(allUsers); 
    });

    return () => {
      off(usersRef, 'value', unsubscribe);
    };
  }, [currentId]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return usersFromDB;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return usersFromDB.filter(user => {
      const nameMatch = user.name?.toLowerCase().includes(lowerCaseSearchTerm);
      const phoneMatch = user.phone?.toLowerCase().includes(lowerCaseSearchTerm);

      return nameMatch || phoneMatch; 
    });
  }, [usersFromDB, searchTerm]); 
  const navigateToChat = (item) => {
    if (!item.id) {
        Alert.alert("Erreur", "ID utilisateur manquant.");
        return;
    }
    props.navigation.navigate("ChatScreen", {
      currentId: currentId,
      secondId: item.id,
      user: item
    });
  };

  const handleCall = (item) => {
    if (item.phone) {
      Alert.alert(
        "Appel", 
        `Appeler ${item.name || item.pseudo || "cet utilisateur"} au ${item.phone} ?`,
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Appeler", 
            onPress: () => {
              console.log(`Tentative d'appel vers: ${item.phone}`);
              Alert.alert("Appel Démarré", `Appel vers ${item.phone}...`);
            }
          }
        ]
      );
    } else {
      Alert.alert("Erreur", "Aucun numéro de téléphone disponible pour cet utilisateur.");
    }
  };

  const renderUserItem = ({ item }) => {
    const statusColor = item.isOnline ? '#25D366' : '#9E9E9E'; 
    const statusText = item.isOnline ? 'En Ligne' : 'Hors Ligne';
    
    return (
      <View style={styles.userItem}>
        <View style={styles.avatarContainer}>
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
          
          <View style={[styles.statusDot, { borderColor: statusColor }]}>
            <View style={[styles.onlineInner, { backgroundColor: statusColor }]} />
          </View>
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{item.name || "Utilisateur Inconnu"}</Text>
          </View>
          
          <View style={styles.statusInfo}>
            <View style={styles.onlineIndicator}>
              <MaterialCommunityIcons 
                name="circle" 
                size={8} 
                color={statusColor} 
                style={styles.statusIcon}
              />
              <Text style={[styles.onlineLabel, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>
          </View>
          
          <Text style={styles.phone}>{item.phone || "Pas de numéro"}</Text>
          <Text style={styles.pseudo}>
            {item.pseudo ? `@${item.pseudo}` : item.email}
          </Text>
        </View>
        
        <View style={styles.iconsRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleCall(item)}
          >
            <MaterialCommunityIcons
              name="phone"
              size={28}
              color={statusColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigateToChat(item)}
          >
            <MaterialCommunityIcons
              name="message-text"
              size={28}
              color="#2D6A4F"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Tous les Utilisateurs</Text>
      
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#40916C" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou téléphone..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          clearButtonMode="while-editing"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.headerStats}>
        <View style={styles.statItem}>
          <View style={styles.onlineDot} />
          <Text style={styles.statText}>
            {usersFromDB.filter(u => u.isOnline).length} en ligne
          </Text>
        </View>
        <View style={[styles.statItem, { marginLeft: 20 }]}>
          <View style={[styles.onlineDot, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.statText}>
            {usersFromDB.filter(u => !u.isOnline).length} hors ligne
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredUsers} 
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchTerm ? (
                <>
                    <MaterialCommunityIcons name="filter-remove-outline" size={60} color="#A5D6A7" />
                    <Text style={styles.emptyTitle}>Aucun résultat pour "{searchTerm}"</Text>
                    <Text style={styles.emptySubtitle}>Veuillez essayer un autre terme de recherche.</Text>
                </>
            ) : (
                <>
                    <MaterialCommunityIcons name="account-off" size={60} color="#A5D6A7" />
                    <Text style={styles.emptyTitle}>Base d'utilisateurs vide</Text>
                    <Text style={styles.emptySubtitle}>Ajoutez des utilisateurs pour commencer à discuter.</Text>
                </>
            )}
          </View>
        }
        renderItem={renderUserItem}
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
    marginBottom: 15,
    textAlign: "center",
  },
  // NOUVEAUX STYLES POUR LA RECHERCHE
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#B7E4C7',
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1B4332',
    height: '100%',
  },
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  // FIN NOUVEAUX STYLES POUR LA RECHERCHE
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25D366',
  },
  statText: {
    fontSize: 14,
    color: '#2D6A4F',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D6A4F',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#40916C",
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#40916C",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2D6A4F",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 22,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#25D366', 
  },
  onlineInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#25D366',
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4332",
    marginRight: 8,
  },
  statusInfo: {
    marginBottom: 4,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  onlineLabel: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '500',
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
});