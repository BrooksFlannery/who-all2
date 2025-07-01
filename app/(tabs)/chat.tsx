import { EventCard } from '@/components/EventCard';
import { ThemedText } from '@/components/ThemedText';
import { useChat } from '@/hooks/useChat';
import React from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  events?: Array<{
    id: string;
    title: string;
    description: string;
    categories: string[];
    attendeesCount: number;
    interestedCount: number;
    location?: {
      neighborhood?: string;
    };
    similarityScore?: number;
  }>;
}

export default function ChatScreen() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  // Wrapper function to handle React Native TextInput changes
  const handleTextChange = (text: string) => {
    handleInputChange({ target: { value: text } } as any);
  };

  // Parse events from message content
  const parseEventsFromMessage = (content: string) => {
    const eventMatch = content.match(/<events>\s*(\[.*?\])\s*<\/events>/s);
    if (eventMatch) {
      try {
        return JSON.parse(eventMatch[1]);
      } catch (error) {
        console.error('Error parsing events from message:', error);
        return [];
      }
    }
    return [];
  };

  // Render each message in the chat
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const events = item.role === 'assistant' ? parseEventsFromMessage(item.content) : [];
    const textContent = item.content.replace(/<events>.*?<\/events>/s, '').trim();

    return (
      <View style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage
      ]}>
        {textContent && (
          <ThemedText style={[
            styles.messageText,
            item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
          ]}>
            {textContent}
          </ThemedText>
        )}

        {events.length > 0 && (
          <View style={styles.eventsContainer}>
            {events.map((event: any, index: number) => (
              <EventCard
                key={`${item.id}-event-${index}`}
                id={event.id}
                title={event.title}
                description={event.description}
                categories={event.categories}
                attendeesCount={event.attendeesCount}
                interestedCount={event.interestedCount}
                location={event.location}
                similarityScore={event.similarityScore}
                compact={true}
                onPress={() => {
                  // TODO: Navigate to event details
                  console.log('Navigate to event:', event.id);
                }}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Messages List */}
      <FlatList
        data={messages as ChatMessage[]}
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
  eventsContainer: {
    marginTop: 8,
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
    fontWeight: '600',
    fontSize: 16,
  },
});
