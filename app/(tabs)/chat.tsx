import { ThemedText } from '@/components/ThemedText';
import { useChat } from '@/hooks/useChat';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChatScreen() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, loadMessageHistory } = useChat();
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isComparingEvents, setIsComparingEvents] = useState(false);

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

  // Wrapper function to handle React Native TextInput changes
  const handleTextChange = (text: string) => {
    handleInputChange({ target: { value: text } } as any);
  };

  // Function to trigger event comparisons (debug feature)
  const handleCompareEvents = useCallback(async () => {

    setIsComparingEvents(true);
    try {

      const response = await fetch('/api/events/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        const count = result.recommendations?.length || 0;
        Alert.alert(
          'Event Comparison Complete',
          `Found ${count} event recommendations. Check console for details.`
        );
      } else {
        Alert.alert('Error', 'Failed to get event recommendations.');
      }
    } catch (error) {
      console.error('💥 Event comparison request failed:', error);
      Alert.alert('Error', 'Failed to connect to recommendations service.');
    } finally {
      setIsComparingEvents(false);
    }
  }, []);

  // Function to trigger user embedding generation (debug feature)
  const handleGenerateEmbeddings = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Embedding Generation Complete',
          `Successfully generated user interest embeddings. Check console for details.`
        );
      } else {
        Alert.alert('Error', 'Failed to generate embeddings.');
      }
    } catch (error) {
      console.error('💥 Embedding generation request failed:', error);
      Alert.alert('Error', 'Failed to connect to embedding service.');
    }
  }, []);

  // Render each message in the chat
  const renderMessage = useCallback(({ item }: { item: any }) => {
    return (
      <View style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage
      ]}>
        <ThemedText style={[
          styles.messageText,
          item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
        ]}>
          {item.content}
        </ThemedText>
      </View>
    );
  }, []);

  // Show loading state while history is being loaded
  if (isLoadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading chat history...</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Debug Buttons - Temporary for development */}
      <View style={styles.debugContainer}>
        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonSecondary, isComparingEvents && styles.debugButtonDisabled]}
          onPress={handleCompareEvents}
          disabled={isComparingEvents}
        >
          <ThemedText style={styles.debugButtonText}>
            {isComparingEvents ? 'Comparing...' : 'Debug: Compare Events'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonPrimary]}
          onPress={handleGenerateEmbeddings}
        >
          <ThemedText style={styles.debugButtonText}>
            Debug: Generate Embeddings
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={() => handleSubmit()}
          disabled={isLoading || !input.trim()}
        >
          <ThemedText style={styles.sendButtonText}>
            {isLoading ? '...' : 'Send'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugContainer: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 4,
  },
  debugButtonSecondary: {
    backgroundColor: '#34C759',
  },
  debugButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  debugButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
