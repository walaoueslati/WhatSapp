import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { db, auth } from "../../firebase/config";
import { ref, onValue } from "firebase/database";

export default function UsersListScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const usersRef = ref(db, "users");

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .filter((key) => key !== currentUser.uid)
          .map((key) => ({ id: key, ...data[key] }));
        setUsers(list);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChatPress = (user) => {
    const chatId = [currentUser.uid, user.id].sort().join("_");

    navigation.navigate("ChatScreen", {
      chatId,
      user, 
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liste des utilisateurs</Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun utilisateur trouvé.</Text>
        }
        renderItem={({ item }) => (
  <View style={styles.userItem}>
    {item.profileImage ? (
      <Image source={{ uri: item.profileImage }} style={styles.avatar} />
    ) : (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {item.name?.[0] ?? "?"}
        </Text>
      </View>
    )}

    <Text style={styles.userText}>
      {item.name ?? item.pseudo}
    </Text>

    <TouchableOpacity
      style={styles.chatButton}
      onPress={() => handleChatPress(item)}
    >
      <Text style={styles.chatButtonText}>💬</Text>
    </TouchableOpacity>
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
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D6A4F",
    marginBottom: 20,
    textAlign: "center",
  },
  userItem: {
    flexDirection: "row",
    backgroundColor: "#B7E4C7",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#40916C",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  userText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B4332",
  },
  chatButton: {
    backgroundColor: "#40916C",
    padding: 10,
    borderRadius: 50,
    marginLeft: "auto",
  },
  chatButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#2D6A4F",
    fontSize: 16,
  },
});
