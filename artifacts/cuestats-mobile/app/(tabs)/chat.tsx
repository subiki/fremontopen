import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { useColors } from "@/hooks/useColors";
import { apiPost, getStreamUrl, type Conversation, type ChatMessage } from "@/lib/api";

function MessageBubble({ message }: { message: ChatMessage }) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const ensureConversation = async (): Promise<number> => {
    if (conversationId !== null) return conversationId;
    setIsCreating(true);
    try {
      const conv = await apiPost<Conversation>("/anthropic/conversations", {
        title: "Mobile Chat",
      });
      setConversationId(conv.id);
      return conv.id;
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
    };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);

    try {
      const convId = await ensureConversation();
      setIsStreaming(true);

      const assistantMsg: ChatMessage = { role: "assistant", content: "" };
      setMessages([...currentMessages, assistantMsg]);

      const url = getStreamUrl(`/anthropic/conversations/${convId}/messages`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as { text?: string; delta?: { text?: string }; type?: string };
              const text =
                parsed.text ??
                parsed.delta?.text ??
                (parsed.type === "content_block_delta" ? "" : undefined);
              if (text) {
                accumulated += text;
                const updatedAssistant: ChatMessage = {
                  role: "assistant",
                  content: accumulated,
                };
                setMessages([...currentMessages, updatedAssistant]);
              }
            } catch {
              if (data.length > 0 && !data.startsWith("{")) {
                accumulated += data;
                const updatedAssistant: ChatMessage = {
                  role: "assistant",
                  content: accumulated,
                };
                setMessages([...currentMessages, updatedAssistant]);
              }
            }
          }
        }
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Sorry, I couldn't connect to the AI service. Please check your connection and try again.",
      };
      setMessages([...currentMessages, errorMsg]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const displayedMessages = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.chatHeader,
          {
            paddingTop: topInset + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.aiDot, { backgroundColor: colors.primary }]} />
        <View>
          <Text style={[styles.chatTitle, { color: colors.foreground }]}>CueBot</Text>
          <Text style={[styles.chatSubtitle, { color: colors.mutedForeground }]}>
            Billiards AI Assistant
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messageList}
        data={displayedMessages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <MessageBubble message={item} />}
        inverted
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Ask CueBot anything
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Player stats, match history, tournament results, Fargo ratings — ask away.
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomInset + 8,
          },
        ]}
      >
        <View
          style={[
            styles.inputRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Ask about players, matches..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            returnKeyType="send"
            testID="chat-input"
          />
          <Pressable
            onPress={sendMessage}
            disabled={isStreaming || !input.trim() || isCreating}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  !isStreaming && input.trim() && !isCreating
                    ? colors.primary
                    : colors.muted,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {isStreaming || isCreating ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Ionicons name="send" size={16} color={colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chatTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  chatSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubbleRowBot: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  emptyChat: {
    alignItems: "center",
    padding: 32,
    gap: 12,
    transform: [{ scaleY: -1 }],
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
