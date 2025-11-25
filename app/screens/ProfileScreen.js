import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Button,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, get, update, remove } from 'firebase/database';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    pseudo: '',
    phone: '',
    profileImage: '',
  });
  const [uploading, setUploading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const userRef = dbRef(db, `users/${auth.currentUser.uid}`);
    get(userRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData({
          name: data.name || '',
          email: data.email || '',
          pseudo: data.pseudo || '',
          phone: data.phone || '',
          profileImage: data.profileImage || '',
        });
        setIsActive(data.isActive || false);
      }
    });
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Permission to access gallery is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      uploadProfilePicture(imageUri);
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    setUploading(true);
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileRef = storageRef(db, `profile-pictures/profile-${auth.currentUser.uid}.jpg`);
      await uploadBytes(fileRef, blob);
      const imageUrl = await getDownloadURL(fileRef);
      await update(dbRef(db, `users/${auth.currentUser.uid}`), { profileImage: imageUrl });
      setUserData({ ...userData, profileImage: imageUrl });
    } catch (error) {
      Alert.alert('Upload Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await update(dbRef(db, `users/${auth.currentUser.uid}`), { isActive: false });
      await signOut(auth);
      navigation.reset({ routes: [{ name: 'Login' }] });
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleEditProfile = async () => {
    try {
      await update(dbRef(db, `users/${auth.currentUser.uid}`), {
        name: userData.name,
        
        pseudo: userData.pseudo,
        phone: userData.phone,
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete your profile? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(dbRef(db, `users/${auth.currentUser.uid}`));
              await auth.currentUser.delete();
              navigation.reset({ routes: [{ name: 'Login' }] });
            } catch (error) {
              Alert.alert("Error", "Failed to delete profile: " + error.message);
            }
          }
        }
      ]
    );
  };

 

  return (
    <SafeAreaView style={styles.container}>
      

      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={pickImage}>
          {userData.profileImage ? (
            <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.uploadButton}>
              <Text style={styles.uploadText}>Upload</Text>
            </View>
          )}
        </TouchableOpacity>
        {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}

        <Text style={styles.profileText}>Name: {userData.name}</Text>
        <Text style={styles.profileText}>Email: {userData.email}</Text>
        <Text style={styles.profileText}>Phone: {userData.phone}</Text>
        <Text style={styles.profileText}>Pseudo: {userData.pseudo}</Text>

        <View style={styles.buttonRow}>
  <TouchableOpacity style={styles.editButton} onPress={() => setIsEditModalVisible(true)}>
    <Text style={styles.buttonText}>Edit</Text>
  </TouchableOpacity>
  
  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProfile}>
    <Text style={styles.buttonText}>Delete</Text>
  </TouchableOpacity>
  
  <TouchableOpacity style={styles.logoutButtonInline} onPress={handleLogout}>
    <Text style={styles.buttonText}>Logout</Text>
  </TouchableOpacity>
</View>


       
      </View>

      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput style={styles.input} placeholder="Name" value={userData.name} onChangeText={(text) => setUserData({ ...userData, name: text })}/>
            <TextInput style={styles.input} placeholder="Phone" value={userData.phone} onChangeText={(text) => setUserData({ ...userData, phone: text })}/>
            <TextInput style={styles.input} placeholder="Pseudo" value={userData.pseudo} onChangeText={(text) => setUserData({ ...userData, pseudo: text })}/>
            <View style={styles.modalButtonRow}>
              <Button title="Save" color="#4CAF50" onPress={handleEditProfile}/>
              <Button title="Cancel" color="#9E9E9E" onPress={() => setIsEditModalVisible(false)}/>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E8F5E9', 
    paddingTop: 20,
  },

  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 15,
  },

  uploadButton: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#C8E6C9',
    borderRadius: 65,
    marginBottom: 15,
  },

  uploadText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  uploadingText: {
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 10,
  },

  profileText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#1B5E20',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },

  editButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    marginRight: 5,
  },

  deleteButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5,
  },

  logoutButtonInline: {
    flex: 1,
    backgroundColor: '#388E3C',
    padding: 12,
    borderRadius: 5,
    marginLeft: 5,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 25,
    padding: 15,
    backgroundColor: '#C8E6C9',
    borderRadius: 10,
  },

  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B5E20',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1B5E20',
    textAlign: 'center',
  },

  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  logoutButton: {
    backgroundColor: '#388E3C',
    padding: 12,
    borderRadius: 5,
    width: '100%',
    marginTop: 15,
  },

  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
