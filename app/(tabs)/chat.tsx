import { ThemedText } from '@/components/ThemedText';
import { useChat } from '@/hooks/useChat';
import { useBackgroundColor, useBorderColor, useCardBackgroundColor, useMessageBackgroundColor, useSecondaryBackgroundColor, useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

/**
 * Props for the ChatMessage component
 */
interface ChatMessageProps {
  message: any;
  isOwnMessage: boolean;
}

/**
 * ChatMessage Component
 * 
 * Renders an individual chat message with user avatar, name, and timestamp.
 * Features Apple-like design with refined typography and subtle shadows.
 * 
 * @component
 * @param {ChatMessageProps} props - Component props
 * @returns {JSX.Element} The rendered chat message
 */
const ChatMessage = React.memo(function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const textColor = useTextColor();
  const messageBackgroundColor = useMessageBackgroundColor();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      {!isOwnMessage && (
        <View style={styles.messageHeader}>
          <View style={styles.aiAvatar}>
            <ThemedText style={styles.aiAvatarText}>AI</ThemedText>
          </View>
          <ThemedText style={[styles.userName, { color: textColor }]}>Assistant</ThemedText>
        </View>
      )}
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
        {
          backgroundColor: isOwnMessage ? '#007AFF' : messageBackgroundColor,
          shadowColor: isOwnMessage ? '#007AFF' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isOwnMessage ? 0.2 : 0.05,
          shadowRadius: 3,
          elevation: isOwnMessage ? 3 : 1,
        }
      ]}>
        <ThemedText style={[
          styles.messageText,
          { color: isOwnMessage ? '#FFFFFF' : textColor }
        ]}>
          {message.content}
        </ThemedText>
      </View>
      <ThemedText style={[styles.messageTime, { color: textColor }]}>
        {formatTime(message.createdAt || new Date().toISOString())}
      </ThemedText>
    </View>
  );
});

/**
 * MessageInput Component
 * 
 * Provides a text input for sending messages with Apple-like design.
 * Features refined styling, subtle shadows, and elegant interactions.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.value - Current input value
 * @param {(text: string) => void} props.onChangeText - Text change handler
 * @param {() => void} props.onSend - Send message handler
 * @param {boolean} props.disabled - Whether input is disabled
 * @returns {JSX.Element} The rendered message input
 */
const MessageInput = React.memo(function MessageInput({
  value,
  onChangeText,
  onSend,
  disabled
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const textColor = useTextColor();
  const cardBackgroundColor = useCardBackgroundColor();
  const borderColor = useBorderColor();
  const secondaryTextColor = useSecondaryTextColor();
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend();
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <View style={[styles.inputContainer, { backgroundColor: cardBackgroundColor }]}>
      <View style={[
        styles.textInputContainer,
        {
          borderColor: borderColor,
          backgroundColor: cardBackgroundColor,
        }
      ]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            { color: textColor }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message..."
          placeholderTextColor={secondaryTextColor}
          multiline
          maxLength={500}
          onKeyPress={handleKeyPress}
          editable={!disabled}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor: value.trim() && !disabled ? '#007AFF' : '#C7C7CC',
          }
        ]}
        onPress={handleSend}
        disabled={disabled || !value.trim()}
      >
        <ThemedText style={styles.sendButtonText}>
          Send
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
});

export default function ChatScreen() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, loadMessageHistory } = useChat();
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const backgroundColor = useBackgroundColor();
  const secondaryBackgroundColor = useSecondaryBackgroundColor();

  // Load message history when component mounts (only once)
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        await loadMessageHistory();
      } catch (error) {
        console.error('❌ Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, []); // Empty dependency array - only run once on mount

  // Sync input text with the hook's input
  useEffect(() => {
    setInputText(input);
  }, [input]);

  // Render each message in the chat
  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isOwnMessage = item.role === 'user';
    return <ChatMessage message={item} isOwnMessage={isOwnMessage} />;
  }, []);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const handleSend = async () => {
    if (inputText.trim() && !isLoading) {
      const currentInput = inputText;
      setInputText('');

      // Update the hook's input and submit
      handleInputChange({ target: { value: currentInput } } as any);
      await handleSubmit();
    }
  };

  const renderFooter = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.loadingText}>AI is thinking...</ThemedText>
        </View>
      );
    }
    return null;
  };

  // Show loading state while history is being loaded
  if (isLoadingHistory) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: secondaryBackgroundColor }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading chat history...</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: secondaryBackgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          nestedScrollEnabled={true}
          ListFooterComponent={renderFooter}
        />
      </View>

      <MessageInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        disabled={isLoading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '75%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 4,
  },
  aiAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  userName: {
    fontSize: 11,
    marginLeft: 6,
    opacity: 0.6,
    fontWeight: '500',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '100%',
  },
  ownMessageBubble: {
    borderBottomRightRadius: 0,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 4,
    marginHorizontal: 4,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  textInputContainer: {
    flex: 1,
    height: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: 'top',
    minHeight: 20,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    opacity: 0.6,
    fontWeight: '400',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});
