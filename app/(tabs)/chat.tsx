import { EventCard } from '@/components/EventCard';
import { ThemedText } from '@/components/ThemedText';
import { useChat } from '@/hooks/useChat';
import { Event } from '@/lib/db/types';
import React from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChatScreen() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  // Wrapper function to handle React Native TextInput changes
  const handleTextChange = (text: string) => {
    handleInputChange({ target: { value: text } } as any);
  };

  // Handle event card press
  const handleEventPress = (event: Event) => {
    // TODO: Navigate to event details or handle event interaction
    console.log('Event pressed:', event.title);
  };

  // Render each message in the chat
  const renderMessage = ({ item }: { item: any }) => {
    console.log('=== RENDER MESSAGE START ===');
    console.log('Message ID:', item.id);
    console.log('Message role:', item.role);
    console.log('Message type:', item.type);
    console.log('Message content:', item.content);
    console.log('Has events:', !!item.events);
    console.log('Events length:', item.events?.length || 0);
    console.log('Events data:', item.events ? item.events.map((e: any) => ({ id: e.id, title: e.title })) : null);
    console.log('Condition check - item.type === "event_cards":', item.type === 'event_cards');
    console.log('Condition check - item.events && item.events.length > 0:', item.events && item.events.length > 0);
    console.log('Full condition result:', item.type === 'event_cards' && item.events && item.events.length > 0);

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

        {/* Render event cards for messages with type 'event_cards' and events */}
        {(() => {
          const shouldRenderEvents = item.type === 'event_cards' && item.events && item.events.length > 0;
          console.log('=== EVENT RENDERING CONDITION ===');
          console.log('shouldRenderEvents:', shouldRenderEvents);

          if (shouldRenderEvents) {
            console.log('RENDERING EVENT CARDS');
            console.log('Number of events to render:', item.events.length);
            return (
              <View style={styles.eventsContainer}>
                {item.events.map((event: Event, index: number) => {
                  console.log(`Rendering event ${index + 1}:`, event.title);
                  console.log('Event data:', JSON.stringify(event, null, 2));

                  // Validate event data before rendering
                  if (!event || !event.id || !event.title) {
                    console.warn('Invalid event data:', event);
                    return null;
                  }

                  console.log('Event validation passed, creating EventCard component');
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPress={() => handleEventPress(event)}
                      compact={true}
                    />
                  );
                }).filter(Boolean)}
              </View>
            );
          } else {
            console.log('NOT RENDERING EVENT CARDS - condition not met');
            return null;
          }
        })()}
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
    marginTop: 12,
    gap: 12,
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
