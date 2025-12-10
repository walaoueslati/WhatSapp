import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image, 
    ActivityIndicator, 
    Linking, 
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { db, supabase } from "../../firebase/config"; 
import { ref, onValue, off, push, set, get } from "firebase/database"; 
import * as ImagePicker from "expo-image-picker"; 
import * as  DocumentPicker from "expo-document-picker"; 
import * as FileSystem from "expo-file-system"; 
import { decode } from 'base64-arraybuffer';

const CHAT_MEDIA_BUCKET = "chat-images"; 

const GROUP_TYPING_NODE = (discussionID) => `discussions/${discussionID}/typing`;


export default function ChatScreen(props) {
    const currentId = props.route.params?.currentId;
    const secondId = props.route.params?.secondId;
    const user = props.route.params?.user; 

    const discussionID = props.route.params?.discussionID;
    const groupId = props.route.params?.groupId;
    const groupName = props.route.params?.groupName;
    const groupImage = props.route.params?.groupImage;
    const isGroup = props.route.params?.isGroup || false;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [istyping, setIstyping] = useState(false); 
    const [groupTypingUsers, setGroupTypingUsers] = useState([]);
    const [uploading, setUploading] = useState(false); 
    const [senderCache, setSenderCache] = useState({});

    const flatListRef = useRef(null);

    const getChatId = () => {
        if (isGroup && discussionID) {
            return discussionID;
        } else if (currentId && secondId) {
            return currentId > secondId
                ? currentId + secondId
                : secondId + currentId;
        }
        return null;
    };

    const getDiscussionPath = () => {
        if (isGroup && discussionID) {
            return ref(db, `discussions/${discussionID}/messages`);
        } else if (chatId) {
            return ref(db, `ALL_CHATS/${chatId}/discussion`);
        }
        return null;
    };

    const getTypingPath = () => {
        if (isGroup && discussionID) {
            return ref(db, GROUP_TYPING_NODE(discussionID)); 
        } else if (chatId && secondId) {
            return ref(db, `ALL_CHATS/${chatId}/${secondId}istyping`);
        }
        return null;
    };

    const getMyTypingPath = () => {
        if (isGroup && discussionID) {
            return ref(db, `${GROUP_TYPING_NODE(discussionID)}/${currentId}`);
        } else if (chatId && currentId) {
            return ref(db, `ALL_CHATS/${chatId}/${currentId}istyping`);
        }
        return null;
    };

    const chatId = getChatId();
    const ref_discussion = getDiscussionPath();
    const ref_typing = getTypingPath(); 
    const ref_my_typing = getMyTypingPath();



    const fetchSenderDetails = useCallback(async (senderId) => {
        if (!senderId || senderCache[senderId]) {
            return senderCache[senderId] || 'Inconnu';
        }

        try {
            const snapshot = await get(ref(db, `users/${senderId}/name`));
            const name = snapshot.val();
            
            if (name) {
                setSenderCache(prev => ({ ...prev, [senderId]: name }));
                return name;
            }
        } catch (error) {
            console.error("Failed to fetch sender name:", error);
        }
        return 'Membre';
    }, [senderCache]);


    useEffect(() => {
        if (!ref_discussion) {
            Alert.alert("Erreur", "Impossible de charger la discussion");
            return;
        }

        const unsubscribeMessages = onValue(ref_discussion, (snapshot) => {
            let all = [];
            let newSenders = new Set();
            snapshot.forEach((msg) => {
                const message = msg.val();
                all.push(message);
                if (isGroup && !senderCache[message.sender]) {
                    newSenders.add(message.sender);
                }
            });
            setMessages(all);

            if (newSenders.size > 0) {
                newSenders.forEach(id => fetchSenderDetails(id));
            }

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        
        let unsubscribeTyping = null;

        if (ref_typing) {
            if (isGroup) {
                unsubscribeTyping = onValue(ref_typing, (snapshot) => {
                    const typingData = snapshot.val() || {};
                    const typingIds = Object.keys(typingData).filter(
                        
                        id => typingData[id] === true && id !== currentId
                    );
                    setGroupTypingUsers(typingIds);

                    typingIds.forEach(id => {
                        if (!senderCache[id]) {
                            fetchSenderDetails(id);
                        }
                    });
                });
            } else {
                unsubscribeTyping = onValue(ref_typing, (snapshot) => {
                    setIstyping(snapshot.val() || false);
                });
            }
        }

        return () => {
            if (ref_discussion) off(ref_discussion);
            if (unsubscribeTyping) off(ref_typing); 
            
            if (ref_my_typing) {
                set(ref_my_typing, false);
            }
        };
    }, [chatId, isGroup, discussionID, fetchSenderDetails, senderCache]); 


    const handleTypingStart = () => {
        if (ref_my_typing) {
            set(ref_my_typing, true); 
        }
    };

    const handleTypingEnd = () => {
        if (ref_my_typing) {
            // Mettre notre propre statut à false
            set(ref_my_typing, false);
        }
    };
    
    // NOUVELLE FONCTION : Afficher les noms des personnes qui écrivent
    const renderTypingIndicatorText = () => {
        if (isGroup) {
            if (groupTypingUsers.length === 0) return null;

            // Récupérer les noms à partir du cache
            const typingNames = groupTypingUsers
                .map(id => senderCache[id] || 'Membre')
                .filter(name => name !== 'Chargement...'); 

            if (typingNames.length === 0 && groupTypingUsers.length > 0) {
                return "Chargement des utilisateurs...";
            }
            
            if (typingNames.length === 1) {
                return `${typingNames[0]} est en train d'écrire...`;
            }

            if (typingNames.length === 2) {
                return `${typingNames[0]} et ${typingNames[1]} écrivent...`;
            }

            return `${typingNames[0]}, ${typingNames[1]} et ${typingNames.length - 2} autres écrivent...`;

        } else if (istyping) {
            // Logique de chat privé
            return `${user?.name || "Quelqu'un"} est en train d'écrire...`;
        }
        return null;
    };


    // --- Le reste des fonctions (upload, sendMessage, renderMessage, etc.) reste inchangé ---

    const uploadFileToSupabase = async (uri, fileName, mimeType) => {
        setUploading(true);
        
        const safeFileName = fileName
            .normalize("NFD") 
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-zA-Z0-9.\-_]/g, '_'); 

        try {
            const path = `${isGroup ? 'group_media' : 'chat_media'}/${currentId}_${Date.now()}_${safeFileName}`;
            let fileData;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                fileData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });
            } else {
                const base64File = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                fileData = decode(base64File);
            }

            const { error } = await supabase.storage
                .from(CHAT_MEDIA_BUCKET)
                .upload(path, fileData, {
                    contentType: mimeType || 'application/octet-stream',
                    cacheControl: '3600',
                    upsert: true,
                });

            if (error) throw error;

            const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);
            return data.publicUrl;
        } catch (error) {
            console.error('Upload Supabase Error:', error);
            Alert.alert('Erreur Upload', `Impossible d'uploader le fichier: ${error.message}`);
            return null;
        } finally {
            setUploading(false);
        }
    };


    const pickAndSendImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            return Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire pour envoyer des images.');
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const file = result.assets[0];
            const fileName = `image_${Date.now()}.jpg`;

            const publicUrl = await uploadFileToSupabase(file.uri, fileName, 'image/jpeg');

            if (publicUrl) {
                await sendMessage("image", { url: publicUrl, type: 'image', width: file.width, height: file.height });
            }
        }
    };

    const pickAndSendFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];

                if (file.size > 10 * 1024 * 1024) { 
                    return Alert.alert("Fichier trop volumineux", "La taille maximale est de 10MB.");
                }

                const publicUrl = await uploadFileToSupabase(file.uri, file.name, file.mimeType);

                if (publicUrl) {
                    await sendMessage("file", {
                        url: publicUrl,
                        name: file.name,
                        type: file.mimeType,
                    });
                }
            }
        } catch (err) {
            setUploading(false);
            Alert.alert("Échec de l'upload", "Impossible de traiter ce fichier. " + (err.message || ""));
        }
    };

    const sendMessage = async (type = 'text', content = null) => {
        if (type === 'text' && input.trim().length === 0) return;

        if (!ref_discussion) {
            Alert.alert("Erreur", "Impossible d'envoyer le message");
            return;
        }

        const newMessageRef = push(ref_discussion);

        const messageData = {
            idmsg: newMessageRef.key,
            sender: currentId,
            time: new Date().toLocaleString(),
            type: type, 
        };

        if (type === 'text') {
            messageData.message = input.trim();
        } else if (type === 'image') {
            messageData.image = content.url;
            messageData.imageMeta = { width: content.width, height: content.height };
            messageData.message = 'Image';
        } else if (type === 'file') {
            messageData.file = content;
            messageData.message = `Fichier: ${content.name}`;
        }

        if (isGroup) {
            messageData.receiver = groupId;
        } else {
            messageData.receiver = secondId;
        }

        try {
            await set(newMessageRef, messageData);
            setInput("");
            if (ref_my_typing) {
                set(ref_my_typing, false);
            }
        } catch (error) {
            console.error('Erreur envoi message:', error);
            Alert.alert("Erreur", "Impossible d'envoyer le message");
        }
    };

    const getHeaderTitle = () => {
        if (isGroup && groupName) {
            return groupName;
        } else if (user?.name) {
            return user.name;
        }
        return "Chat";
    };


    const renderMessage = ({ item }) => {
        const isMyMessage = item.sender === currentId;
        const time = item.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const senderName = senderCache[item.sender] || 'Chargement...';
        
        const renderImage = () => (
            <TouchableOpacity onPress={() => Linking.openURL(item.image)} style={styles.imageContainer}>
                <Image
                    source={{ uri: item.image }}
                    style={styles.messageImage}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        );

        const renderFile = () => (
            <TouchableOpacity
                onPress={() => Linking.openURL(item.file.url)}
                style={[styles.fileBubble, { backgroundColor: isMyMessage ? 'rgba(0,0,0,0.1)' : '#f0f0f0' }]}
            >
                <Ionicons name="document-text" size={20} color={isMyMessage ? "#fff" : "#1B4332"} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.fileNameText, { color: isMyMessage ? "#fff" : "#1B4332" }]} numberOfLines={1}>
                        {item.file.name || 'Fichier'}
                    </Text>
                    <Text style={[styles.fileType, { color: isMyMessage ? "#ddd" : "#8898AA" }]}>
                        {item.file.type.split('/').pop()?.toUpperCase() || 'File'}
                    </Text>
                </View>
                <MaterialIcons name="file-download" size={20} color={isMyMessage ? "#fff" : "#1B4332"} />
            </TouchableOpacity>
        );

        return (
            <View
                style={[
                    styles.messageWrapper,
                    isMyMessage
                        ? styles.myMessageWrapper
                        : styles.theirMessageWrapper,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        isMyMessage
                            ? styles.myBubble
                            : styles.theirBubble,
                    ]}
                >
                    {(isGroup && !isMyMessage) && (
                        <Text style={styles.senderNameText}>
                            {senderName}
                        </Text>
                    )}

                    {item.type === 'image' && item.image ? renderImage() : null}
                    {item.type === 'file' && item.file ? renderFile() : null}

                    {item.type === 'text' || (item.message && item.message !== 'Image' && !item.file) ? (
                        <Text style={styles.messageText}>{item.message}</Text>
                    ) : null}

                    <Text style={styles.timeText}>{time}</Text>
                </View>
            </View>
        );
    };


    
    const typingText = renderTypingIndicatorText();

    if (!chatId) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Discussion introuvable</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => props.navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ImageBackground
                source={require("../../assets/bg.jpg")}
                style={styles.container}
                resizeMode="cover"
            >
                <StatusBar style="light" />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => props.navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {getHeaderTitle()}
                    </Text>
                    {isGroup && (
                        <Text style={styles.groupBadge}>Groupe</Text>
                    )}
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.idmsg}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }}
                />

                {(isGroup ? groupTypingUsers.length > 0 : istyping) && (
                    <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>
                            {typingText}
                        </Text>
                    </View>
                )}
                
                {uploading && (
                    <View style={styles.uploadingIndicator}>
                        <ActivityIndicator size="small" color="#2D6A4F" />
                        <Text style={styles.typingText}> Uploading...</Text>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={pickAndSendFile} style={styles.mediaButton} disabled={uploading}>
                        <Ionicons name="attach" size={24} color="#40916C" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={pickAndSendImage} style={styles.mediaButton} disabled={uploading}>
                        <Ionicons name="image" size={24} color="#40916C" />
                    </TouchableOpacity>

                    <TextInput
                        onFocus={handleTypingStart}
                        onBlur={handleTypingEnd}
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Tapez un message..."
                        placeholderTextColor="#8898AA"
                        multiline
                        onSubmitEditing={() => sendMessage('text')}
                        editable={!uploading}
                    />

                    <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage('text')} disabled={uploading}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#E9F7EF",
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#E9F7EF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2D6A4F",
        paddingVertical: 12,
        paddingHorizontal: 15,
        paddingTop: 50,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 20,
        marginLeft: 10,
        fontWeight: "600",
        flex: 1,
    },
    groupBadge: {
        backgroundColor: "#40916C",
        color: "#fff",
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 5,
    },
    messagesList: {
        padding: 10,
        paddingBottom: 20,
    },
    messageWrapper: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginVertical: 5,
    },
    myMessageWrapper: {
        justifyContent: "flex-end",
    },
    theirMessageWrapper: {
        justifyContent: "flex-start",
    },
    messageBubble: {
        maxWidth: "75%",
        padding: 12,
        borderRadius: 14,
    },
    myBubble: {
        backgroundColor: "#B7E4C7",
        borderBottomRightRadius: 0,
    },
    theirBubble: {
        backgroundColor: "#fff",
        borderBottomLeftRadius: 0,
        borderWidth: 1,
        borderColor: "#40916C",
    },
    senderNameText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#40916C', 
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        color: "#1B4332",
    },
    timeText: {
        fontSize: 10,
        color: "#8898AA",
        marginTop: 4,
        textAlign: "right",
    },
    typingIndicator: {
        paddingHorizontal: 15,
        paddingVertical: 5,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    uploadingIndicator: { 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    typingText: {
        fontSize: 12,
        color: "#40916C",
        fontStyle: "italic",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end", 
        padding: 10,
        backgroundColor: "#E9F7EF",
        borderTopWidth: 1,
        borderColor: "#B7E4C7",
    },
    mediaButton: { 
        padding: 8,
        marginBottom: Platform.OS === 'android' ? 5 : 0, 
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#40916C",
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 20,
        marginRight: 10,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: "#40916C",
        padding: 12,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Platform.OS === 'android' ? 5 : 0, 
    },
    imageContainer: {
        marginBottom: 5,
        borderRadius: 10,
        overflow: 'hidden',
    },
    messageImage: {
        width: 200, 
        height: 150, 
        borderRadius: 10,
    },
    fileBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 10,
        minWidth: 180,
        maxWidth: '100%',
    },
    fileNameText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    fileType: {
        fontSize: 10,
    },
});