import React, { useState, useEffect } from 'react';
import {
  Alert,
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  ImageBackground,
  ActivityIndicator
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { auth, db, supabase } from '../../firebase/config';
import { ref as dbRef, get, update, remove } from 'firebase/database';
import { signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

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
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Function to upload image to Supabase (méthodologie du premier code)
  const uploadImageToSupabase = async (localURL) => {
    try {
      const response = await fetch(localURL);
      const blob = await response.blob();
      const arraybuffer = await new Response(blob).arrayBuffer();
      
      const fileName = `${auth.currentUser.uid}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('LesImages_Profile')
        .upload(fileName, arraybuffer, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('LesImages_Profile')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  };

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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0].uri) {
      uploadProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    setUploading(true);
    try {
      // Upload to Supabase
      const imageUrl = await uploadImageToSupabase(imageUri);
      
      // Update Firebase database with new image URL
      await update(dbRef(db, `users/${auth.currentUser.uid}`), { 
        profileImage: imageUrl 
      });
      
      setUserData({ ...userData, profileImage: imageUrl });
      Alert.alert('Success', 'Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload image. Please try again.');
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
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteProfile = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      // Reauthenticate user with password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Delete from Supabase storage (optional)
      try {
        await supabase.storage
          .from('LesImages_Profile')
          .remove([`${auth.currentUser.uid}.jpg`]);
      } catch (storageError) {
        console.log('Storage deletion error:', storageError);
        // Continue even if storage deletion fails
      }
      
      // Delete from Firebase Realtime Database
      await remove(dbRef(db, `users/${auth.currentUser.uid}`));
      
      // Delete Firebase Auth account
      await auth.currentUser.delete();
      
      setIsDeleteModalVisible(false);
      setDeletePassword('');
      navigation.reset({ routes: [{ name: 'Login' }] });
      
    } catch (error) {
      console.error('Delete error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete profile: ' + error.message);
      }
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/bg.jpg')} 
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {userData.profileImage ? (
              <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.uploadButton}>
                <Text style={styles.uploadText}>Upload</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}

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

        {/* Edit Profile Modal */}
        <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Name" 
                value={userData.name} 
                onChangeText={(text) => setUserData({ ...userData, name: text })}
              />
              <TextInput 
                style={styles.input} 
                placeholder="Phone" 
                value={userData.phone} 
                onChangeText={(text) => setUserData({ ...userData, phone: text })}
              />
              <TextInput 
                style={styles.input} 
                placeholder="Pseudo" 
                value={userData.pseudo} 
                onChangeText={(text) => setUserData({ ...userData, pseudo: text })}
              />
              <View style={styles.modalButtonRow}>
                <Button title="Save" color="#4CAF50" onPress={handleEditProfile}/>
                <Button title="Cancel" color="#9E9E9E" onPress={() => setIsEditModalVisible(false)}/>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Profile Modal */}
        <Modal visible={isDeleteModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Delete Profile</Text>
              <Text style={styles.warningText}>
                Are you sure you want to delete your profile? This action cannot be undone.
              </Text>
              <Text style={styles.passwordLabel}>Enter your password to confirm:</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Password" 
                value={deletePassword} 
                onChangeText={setDeletePassword}
                secureTextEntry={true}
                autoCapitalize="none"
              />
              <View style={styles.modalButtonRow}>
                <Button 
                  title="Delete" 
                  color="#D32F2F" 
                  onPress={confirmDeleteProfile}
                />
                <Button 
                  title="Cancel" 
                  color="#9E9E9E" 
                  onPress={() => {
                    setIsDeleteModalVisible(false);
                    setDeletePassword('');
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 245, 233, 0.85)',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '90%',
    padding: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    marginTop: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  uploadButton: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 70,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  uploadText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadingText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  profileText: {
    fontSize: 16,
    marginBottom: 12,
    color: '#1B5E20',
    fontWeight: '500',
    width: '100%',
    textAlign: 'left',
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonInline: {
    flex: 1,
    backgroundColor: '#388E3C',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#388E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.5)',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1B5E20',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  warningText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  passwordLabel: {
    fontSize: 14,
    color: '#1B5E20',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 52,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: '500',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
});