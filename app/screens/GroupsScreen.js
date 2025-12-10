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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { auth, db, supabase } from "../../firebase/config"; 
import { ref, onValue, off, set, get, remove } from "firebase/database";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';


const GROUP_IMAGE_BUCKET = 'Group_Images'; 
const DEFAULT_GROUP_IMAGE = "https://cdn-icons-png.flaticon.com/512/194/194938.png";

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState(null); 
  const [loading, setLoading] = useState(false); 
  const [uploading, setUploading] = useState(false); 
  const [groupDescription, setGroupDescription] = useState("");

  const currentUserID = auth.currentUser?.uid;

  // --- I. CHARGEMENT DES DONNÉES ---
  
  // Charger les groupes de l'utilisateur actuel
  useEffect(() => {
    if (!currentUserID) return;

    const groupsRef = ref(db, "groups");

    const unsubscribe = onValue(groupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userGroups = Object.entries(data)
          .filter(([_, group]) => group.members && group.members[currentUserID])
          .map(([id, info]) => ({
            id,
            ...info,
            memberCount: Object.keys(info.members || {}).length
          }));

        setGroups(userGroups);
      } else {
        setGroups([]);
      }
    });

    return () => off(groupsRef);
  }, [currentUserID]);

  // Charger tous les utilisateurs (sauf l'utilisateur actuel)
  useEffect(() => {
    if (!currentUserID) return;

    const usersRef = ref(db, "users");

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data)
          .filter(([id]) => id !== currentUserID)
          .map(([id, info]) => ({
            id,
            name: info.name || "Inconnu",
            profileImage: info.profileImage || DEFAULT_GROUP_IMAGE 
          }));
        setUsers(usersList);
      }
    });

    return () => off(usersRef);
  }, [currentUserID]);

  // --- II. GESTION DES IMAGES ---
  
  // 1. Sélectionner une image pour le groupe
  const pickGroupImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupImage(result.assets[0].uri);
        console.log('--- DBG: Image de groupe sélectionnée. URI locale:', result.assets[0].uri);
      } else {
         console.log('--- DBG: Sélection d\'image de groupe annulée ou échouée.');
      }
    } catch (error) {
      console.error('--- ERR: Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  // 2. Upload l'image du groupe vers Supabase (avec correction Web/Native)
  const uploadGroupImage = async (imageUri, groupId) => {
    console.log('--- DBG: Début de l\'upload de l\'image pour le groupe ID:', groupId);
    console.log('--- DBG: Utilisation du bucket:', GROUP_IMAGE_BUCKET);
    setUploading(true);
    try {
      const fileName = `group-${groupId}-${Date.now()}.jpg`;
      let fileData;

      // --- LOGIQUE DE LECTURE DU FICHIER ADAPTÉE À LA PLATEFORME ---
      if (Platform.OS === 'web') {
        console.log('--- DBG: (WEB) Lecture du fichier via fetch...');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });
        
      } else {
        // Logique Native (iOS/Android)
        console.log('--- DBG: (NATIVE) Lecture du fichier local en Base64...');
        const base64File = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = decode(base64File); 
      }
      // --- FIN LOGIQUE DE LECTURE ---

      console.log(`--- DBG: Tentative d\'upload vers Supabase (Fichier: ${fileName})`);
      
      // Upload vers Supabase
      const { error } = await supabase.storage
        .from(GROUP_IMAGE_BUCKET) 
        .upload(fileName, fileData, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
         console.error('--- ERR: Erreur Supabase lors de l\'upload:', error.message, error);
         throw error;
      }
      
      console.log('--- DBG: Upload Supabase réussi. Récupération de l\'URL publique...');
      
      const { data: publicUrlData } = supabase.storage
        .from(GROUP_IMAGE_BUCKET)
        .getPublicUrl(fileName);

      if (publicUrlData && publicUrlData.publicUrl) {
         console.log('--- DBG: URL publique de l\'image récupérée:', publicUrlData.publicUrl);
         return publicUrlData.publicUrl;
      } else {
         console.error('--- ERR: URL publique non retournée par Supabase.');
         return null;
      }

    } catch (error) {
      console.error('--- ERR: Erreur globale upload image:', error.message);
      Alert.alert('Erreur', 'Impossible d\'uploader l\'image');
      return null;
    } finally {
        setUploading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      return Alert.alert("Erreur", "Veuillez entrer un nom pour le groupe");
    }
    if (selectedUsers.length === 0) {
      return Alert.alert("Erreur", "Sélectionnez au moins un membre");
    }

    setLoading(true);

    try {
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let imageUrl = null;
      if (groupImage) {
        imageUrl = await uploadGroupImage(groupImage, groupId);
      }
      
      const finalImageUrl = imageUrl || DEFAULT_GROUP_IMAGE;

      const groupData = {
        id: groupId,
        name: groupName.trim(),
        description: groupDescription.trim() || "",
        image: finalImageUrl,
        createdBy: currentUserID,
        createdAt: new Date().toISOString(),
        members: {
          [currentUserID]: true,
          ...selectedUsers.reduce((acc, user) => {
            acc[user.id] = true;
            return acc;
          }, {})
        },
        admin: currentUserID,
        memberCount: selectedUsers.length + 1
      };

      
      await set(ref(db, `groups/${groupId}`), groupData);

      // 3. Ajouter le groupe à chaque membre (`userGroups/memberId/groupId`)
      const allMembers = [currentUserID, ...selectedUsers.map(u => u.id)];
      const updatePromises = allMembers.map(memberId => {
        return set(ref(db, `userGroups/${memberId}/${groupId}`), true);
      });
      await Promise.all(updatePromises);

      // 4. Créer la discussion pour le groupe (`discussions/group_groupId`)
      const discussionId = `group_${groupId}`;
      console.log('--- DBG: Création de la discussion (path: discussions/group_...)');
      await set(ref(db, `discussions/${discussionId}`), {
        type: 'group',
        groupId: groupId,
        groupName: groupName.trim(),
        groupImage: finalImageUrl,
        createdBy: currentUserID,
        createdAt: new Date().toISOString(),
        lastMessage: "",
        lastMessageTime: new Date().toISOString()
      });
      
      // Réinitialiser le formulaire
      setGroupName("");
      setGroupDescription("");
      setSelectedUsers([]);
      setGroupImage(null);
      setModalVisible(false);

      Alert.alert("Succès", "Groupe créé avec succès!");

      // Rediriger vers le chat du groupe
      navigation.navigate('ChatScreen', { 
        discussionID: discussionId,
        groupId: groupId,
        groupName: groupName.trim(),
        groupImage: finalImageUrl,
        isGroup: true,
        currentId: currentUserID
      });

    } catch (error) {
      console.error('--- ERR: Erreur création groupe finale:', error);
      Alert.alert("Erreur", "Impossible de créer le groupe");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Toggle sélection utilisateur
  const toggleSelectUser = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Naviguer vers un groupe
  const navigateToGroup = async (group) => {
    const discussionId = `group_${group.id}`;
    const imageToUse = group.image || DEFAULT_GROUP_IMAGE;

    // Vérifier/Créer la discussion (synchronisation)
    const discussionRef = ref(db, `discussions/${discussionId}`);
    const discussionSnap = await get(discussionRef);

    if (!discussionSnap.exists()) {
      await set(discussionRef, {
        type: 'group',
        groupId: group.id,
        groupName: group.name,
        groupImage: imageToUse,
        createdBy: group.createdBy,
        createdAt: group.createdAt || new Date().toISOString(),
        lastMessage: "",
        lastMessageTime: new Date().toISOString()
      });
    }

    navigation.navigate('ChatScreen', {
      discussionID: discussionId,
      groupId: group.id,
      groupName: group.name,
      groupImage: imageToUse,
      isGroup: true,
      currentId: currentUserID
    });
  };

  // Quitter un groupe
  const leaveGroup = async (groupId) => {
    Alert.alert(
      "Quitter le groupe",
      "Êtes-vous sûr de vouloir quitter ce groupe?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            try {
              // Retirer le membre du groupe
              await remove(ref(db, `groups/${groupId}/members/${currentUserID}`));
              // Retirer le groupe des groupes de l'utilisateur
              await remove(ref(db, `userGroups/${currentUserID}/${groupId}`));

              Alert.alert("Succès", "Vous avez quitté le groupe");
            } catch (error) {
              console.error('Erreur quitter groupe:', error);
              Alert.alert("Erreur", "Impossible de quitter le groupe");
            }
          }
        }
      ]
    );
  };

  // Rendu de chaque groupe
  const renderGroup = ({ item }) => {
    const imageUri = item.image || DEFAULT_GROUP_IMAGE;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigateToGroup(item)}
        onLongPress={() => leaveGroup(item.id)}
      >
        <View style={styles.groupInfo}>
          <Image
            source={{ uri: imageUri }}
            style={styles.groupIcon}
          />
          <View style={styles.groupTextContainer}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMembers}>
              {item.memberCount || Object.keys(item.members || {}).length} membres
            </Text>
            {item.description ? (
              <Text style={styles.groupDescription} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#2E7D32" />
      </TouchableOpacity>
    );
  };

  // --- IV. RENDER DU COMPOSANT ---

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Groupes</Text>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#A5D6A7" />
            <Text style={styles.emptyText}>Aucun groupe</Text>
            <Text style={styles.emptySubtext}>
              Créez un groupe pour commencer à discuter
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB pour ouvrir le modal de création */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setGroupName("");
          setGroupDescription("");
          setSelectedUsers([]);
          setGroupImage(null);
          setModalVisible(true);
        }}
      >
        <MaterialIcons name="group-add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de création de groupe */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !loading && setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackground}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer un nouveau groupe</Text>
              <TouchableOpacity
                onPress={() => !loading && setModalVisible(false)}
                disabled={loading}
              >
                <MaterialIcons name="close" size={28} color="#2E7D32" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Sélection d'image de groupe */}
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickGroupImage}
                disabled={loading || uploading}
              >
                {uploading ? (
                    <ActivityIndicator size="large" color="#2E7D32" style={styles.imagePlaceholder} />
                ) : groupImage ? (
                  <Image
                    source={{ uri: groupImage }}
                    style={styles.selectedImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="camera-alt" size={40} color="#2E7D32" />
                  </View>
                )}
                <Text style={styles.imagePlaceholderText}>
                  Choisir image de groupe
                </Text>
              </TouchableOpacity>

              {/* Nom du groupe */}
              <TextInput
                placeholder="Nom du groupe *"
                value={groupName}
                onChangeText={setGroupName}
                style={styles.input}
                placeholderTextColor="#2E7D32"
                editable={!loading}
              />

              {/* Description du groupe */}
              <TextInput
                placeholder="Description du groupe (Optionnel)"
                value={groupDescription}
                onChangeText={setGroupDescription}
                style={[styles.input, styles.textArea]}
                placeholderTextColor="#2E7D32"
                multiline
                editable={!loading}
              />

              {/* Sélection des membres */}
              <Text style={styles.modalSubtitle}>
                Sélectionner les membres ({selectedUsers.length} sélectionnés) *
              </Text>

              <View style={styles.membersContainer}>
                {users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userCard,
                      selectedUsers.find((u) => u.id === user.id) &&
                      styles.selectedUser,
                    ]}
                    onPress={() => toggleSelectUser(user)}
                    disabled={loading}
                  >
                    <View style={styles.userInfo}>
                      <Image
                        source={{ uri: user.profileImage }}
                        style={styles.profileImage}
                      />
                      <Text style={styles.userName}>{user.name}</Text>
                    </View>
                    {selectedUsers.find((u) => u.id === user.id) && (
                      <MaterialIcons name="check-circle" size={24} color="#2E7D32" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Boutons d'action du modal */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => !loading && setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  (!groupName.trim() || selectedUsers.length === 0 || loading || uploading) &&
                  styles.disabledButton
                ]}
                onPress={createGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0 || loading || uploading}
              >
                {loading || uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Créer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// --- V. STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    paddingTop: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D6A4F",
    marginBottom: 15,
    textAlign: "center",
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#A5D6A7",
    backgroundColor: "#F1F8F5",
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupIcon: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  groupTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: "#558B2F",
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 12,
    color: "#81C784",
    fontStyle: "italic",
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", 
  },
  modalContainer: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "#E8F5E9",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#C8E6C9",
    borderBottomWidth: 1,
    borderBottomColor: "#A5D6A7",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1B5E20",
    flex: 1,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  imagePicker: {
    alignItems: "center",
    marginVertical: 15,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#2E7D32",
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F8F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#A5D6A7",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    color: "#2E7D32",
    marginTop: 8,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#66BB6A",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    backgroundColor: "#fff",
    color: "#1B5E20",
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalSubtitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 10,
  },
  membersContainer: {
    maxHeight: 250,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#A5D6A7",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  selectedUser: {
    backgroundColor: "#C8E6C9",
    borderColor: "#2E7D32",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    color: "#2E7D32",
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#F1F8F5",
    borderTopWidth: 1,
    borderTopColor: "#A5D6A7",
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  confirmButton: {
    backgroundColor: "#2E7D32",
  },
  disabledButton: {
    backgroundColor: "#A5D6A7",
  },
  cancelButtonText: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    color: "#2E7D32",
    marginTop: 20,
    marginBottom: 10,
    fontWeight: "bold",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#81C784",
    textAlign: "center",
    lineHeight: 20,
  },
});