import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/config";
import { ref, onValue, off, push, set } from "firebase/database";

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");

  const currentUserID = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserID) return;

    const groupsRef = ref(db, "groups");
    const usersRef = ref(db, "users");

    onValue(groupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .filter(([_, group]) => group.members?.includes(currentUserID))
          .map(([id, info]) => ({ id, ...info }));
        setGroups(list);
      }
    });

    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .filter(([id]) => id !== currentUserID)
          .map(([id, info]) => ({ id, ...info }));
        setUsers(list);
      }
    });

    return () => {
      off(groupsRef);
      off(usersRef);
    };
  }, []);

  const toggleSelectUser = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      return Alert.alert("Error", "Please enter a group name");
    }
    if (selectedUsers.length === 0) {
      return Alert.alert("Error", "Select at least one member");
    }

    try {
      const groupMembers = [
        ...selectedUsers.map((u) => u.id),
        currentUserID,
      ];

      const newGroupRef = push(ref(db, "groups"));
      await set(newGroupRef, {
        name: groupName,
        members: groupMembers,
        createdAt: new Date().toISOString(),
        createdBy: currentUserID,
      });

      setGroupName("");
      setSelectedUsers([]);
      setModalVisible(false);

      Alert.alert("Success", "Group created!");
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to create group");
    }
  };

  const renderGroup = ({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate("ChatScreen", { chatId: item.id })}
    >
      <View style={styles.groupInfo}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/194/194938.png",
          }}
          style={styles.groupIcon}
        />
        <View>
          <Text style={styles.groupName}>{item.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Groupes</Text>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="group-add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Créer un nouveau groupe</Text>

            <TextInput
              placeholder="Nom du groupe"
              value={groupName}
              onChangeText={setGroupName}
              style={styles.input}
              placeholderTextColor="#2E7D32"
            />

            <Text style={styles.modalSubtitle}>Sélectionner les membres :</Text>

            <ScrollView style={{ marginTop: 10, maxHeight: 300 }}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userCard,
                    selectedUsers.find((u) => u.id === user.id) &&
                      styles.selectedUser,
                  ]}
                  onPress={() => toggleSelectUser(user)}
                >
                  <View style={styles.userInfo}>
                    <Image
                      source={{
                        uri:
                          user.profileImage ||
                          "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                      }}
                      style={styles.profileImage}
                    />
                    <Text style={styles.userName}>{user.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.fab, styles.confirmBtn]}
              onPress={createGroup}
            >
              <MaterialIcons name="check" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeModal}
            >
              <MaterialIcons name="close" size={28} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8F5E9", paddingTop: 20 },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D6A4F",
    marginBottom: 15,
    textAlign: "center",
  },

  groupCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#A5D6A7",
    backgroundColor: "#F1F8F5",
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
  },

  groupInfo: { flexDirection: "row", alignItems: "center" },
  groupIcon: { width: 50, height: 50, borderRadius: 25 },
  groupName: {
    marginLeft: 15,
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  subText: { fontSize: 12, color: "#558B2F" },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    backgroundColor: "#2E7D32",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    width: "90%",
    backgroundColor: "#E8F5E9",
    borderRadius: 15,
    padding: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1B5E20",
    marginBottom: 15,
    textAlign: "center",
  },

  modalSubtitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },

  input: {
    borderWidth: 1,
    borderColor: "#66BB6A",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    backgroundColor: "#fff",
    color: "#1B5E20",
  },

  userCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#A5D6A7",
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: "#fff",
  },
  selectedUser: { backgroundColor: "#C8E6C9" },

  userInfo: { flexDirection: "row", alignItems: "center" },
  profileImage: { width: 45, height: 45, borderRadius: 22 },
  userName: { marginLeft: 10, fontSize: 16, color: "#2E7D32" },

  confirmBtn: { bottom: -10, alignSelf: "center" },
  closeModal: { position: "absolute", top: 15, right: 15 },
});
