import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/config";
import { ref, onValue, off, push, serverTimestamp } from "firebase/database";

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatUser } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const flatListRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = ref(db, `chats/${chatId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const parsed = Object.entries(data).map(([id, value]) => ({ id, ...value }));
      parsed.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(parsed);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    });

    return () => off(messagesRef);
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const messagesRef = ref(db, `chats/${chatId}/messages`);

    await push(messagesRef, {
      text: newMessage,
      sender: user.uid,
      createdAt: serverTimestamp(),
    });

    setNewMessage("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Ionicons
          name="person-circle-outline"
          size={40}
          color="#fff"
          style={{ marginLeft: 10 }}
        />
        <Text style={styles.headerTitle}>
          {chatUser?.name ?? chatUser?.pseudo ?? "Chat"}
        </Text>//fix je veux afficher le nom du user ou bien du groupe 
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMe = item.sender === user.uid;
          return (
            <View
              style={[
                styles.messageWrapper,
                isMe ? styles.myMessageWrapper : styles.theirMessageWrapper,
              ]}
            >
              {!isMe && (
                <Ionicons
                  name="person-circle-outline"
                  size={26}
                  color="#555"
                  style={{ marginRight: 5 }}
                />
              )}
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.input}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9F7EF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D6A4F",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  headerTitle: { color: "#fff", fontSize: 20, marginLeft: 10, fontWeight: "600" },
  messagesList: { padding: 10, paddingBottom: 80 },
  messageWrapper: { flexDirection: "row", alignItems: "flex-end", marginVertical: 5 },
  myMessageWrapper: { justifyContent: "flex-end" },
  theirMessageWrapper: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "75%", padding: 10, borderRadius: 14 },
  myBubble: { backgroundColor: "#B7E4C7", borderBottomRightRadius: 0 },
  theirBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 0, borderWidth: 1, borderColor: "#40916C" },
  messageText: { fontSize: 16, color: "#1B4332" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#E9F7EF",
    borderTopWidth: 1,
    borderColor: "#B7E4C7",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  input: { flex: 1, borderWidth: 1, borderColor: "#40916C", backgroundColor: "#fff", padding: 10, borderRadius: 20, marginRight: 10 },
  sendButton: { backgroundColor: "#40916C", padding: 12, borderRadius: 50 },
});
 