import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase/config";
import { ref, onValue, off, push, set } from "firebase/database";

export default function ChatScreen(props) {
  // Pour les chats privés
  const currentId = props.route.params?.currentId;
  const secondId = props.route.params?.secondId;
  const user = props.route.params?.user;
  
  // Pour les groupes
  const discussionID = props.route.params?.discussionID;
  const groupId = props.route.params?.groupId;
  const groupName = props.route.params?.groupName;
  const isGroup = props.route.params?.isGroup || false;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [istyping, setIstyping] = useState(false);

  const flatListRef = useRef(null);

  // Déterminer l'ID de la discussion
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

  const chatId = getChatId();

  // Déterminer le chemin Firebase
  const getDiscussionPath = () => {
    if (isGroup && discussionID) {
      return ref(db, `discussions/${discussionID}/messages`);
    } else if (chatId) {
      return ref(db, `ALL_CHATS/${chatId}/discussion`);
    }
    return null;
  };

  const getTypingPath = () => {
    if (isGroup) {
      // Pour les groupes, pas d'indicateur de frappe pour l'instant
      return null;
    } else if (chatId && secondId) {
      return ref(db, `ALL_CHATS/${chatId}/${secondId}istyping`);
    }
    return null;
  };

  const getMyTypingPath = () => {
    if (isGroup) {
      return null;
    } else if (chatId && currentId) {
      return ref(db, `ALL_CHATS/${chatId}/${currentId}istyping`);
    }
    return null;
  };

  const ref_discussion = getDiscussionPath();
  const ref_secondistyping = getTypingPath();
  const ref_currentistyping = getMyTypingPath();

  useEffect(() => {
    if (!ref_discussion) {
      Alert.alert("Erreur", "Impossible de charger la discussion");
      return;
    }

    const unsubscribeMessages = onValue(ref_discussion, (snapshot) => {
      let all = [];
      snapshot.forEach((msg) => {
        all.push(msg.val());
      });
      setMessages(all);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Seulement pour les chats privés
    if (!isGroup && ref_secondistyping) {
      const unsubscribeTyping = onValue(ref_secondistyping, (snapshot) => {
        setIstyping(snapshot.val() || false);
      });

      return () => {
        off(ref_discussion);
        off(ref_secondistyping);
        if (ref_currentistyping) {
          set(ref_currentistyping, false);
        }
      };
    }

    return () => {
      if (ref_discussion) off(ref_discussion);
      if (ref_currentistyping) {
        set(ref_currentistyping, false);
      }
    };
  }, [chatId, isGroup]);

  const sendMessage = () => {
    if (input.trim().length === 0) return;
    
    if (!ref_discussion) {
      Alert.alert("Erreur", "Impossible d'envoyer le message");
      return;
    }

    const newMessageRef = push(ref_discussion);

    // Préparer l'objet message
    const messageData = {
      idmsg: newMessageRef.key,
      sender: currentId,
      time: new Date().toLocaleString(),
      message: input.trim(),
    };

    // Ajouter les champs spécifiques selon le type de chat
    if (isGroup) {
      messageData.type = 'group';
      messageData.groupId = groupId;
      messageData.receiver = groupId;
    } else {
      messageData.receiver = secondId;
    }

    try {
      set(newMessageRef, messageData);
      setInput("");
    } catch (error) {
      console.error('Erreur envoi message:', error);
      Alert.alert("Erreur", "Impossible d'envoyer le message");
    }
  };

  const handleTypingStart = () => {
    if (!isGroup && ref_currentistyping) {
      set(ref_currentistyping, true);
    }
  };

  const handleTypingEnd = () => {
    if (!isGroup && ref_currentistyping) {
      set(ref_currentistyping, false);
    }
  };

  // Afficher le nom dans l'en-tête
  const getHeaderTitle = () => {
    if (isGroup && groupName) {
      return groupName;
    } else if (user?.name) {
      return user.name;
    }
    return "Chat";
  };

  // Vérifier si le composant est prêt
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
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageWrapper,
                item.sender === currentId
                  ? styles.myMessageWrapper
                  : styles.theirMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  item.sender === currentId
                    ? styles.myBubble
                    : styles.theirBubble,
                ]}
              >
                <Text style={styles.messageText}>{item.message}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {!isGroup && istyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {user?.name || "Quelqu'un"} est en train d'écrire...
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            onFocus={handleTypingStart}
            onBlur={handleTypingEnd}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Tapez un message..."
            placeholderTextColor="#8898AA"
            multiline
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
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
  typingText: {
    fontSize: 12,
    color: "#40916C",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#E9F7EF",
    borderTopWidth: 1,
    borderColor: "#B7E4C7",
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
  },
  errorText: {
    color: "#2D6A4F",
    fontSize: 16,
    textAlign: "center",
    marginTop: 50,
  },
  backButton: {
    backgroundColor: "#2D6A4F",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 50,
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});