import { useAuth } from '@/components/AuthProvider';
import { useSocket } from '@/components/providers/SocketProvider';
import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useCardBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import { EventMessage, TypingUser } from '@/lib/socket-client';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { UserAvatar } from './UserAvatar';

/**
 * Props for the ChatSection component
 */
interface ChatSectionProps {
    eventId: string;
    messages: EventMessage[];
    typingUsers: TypingUser[];
    onSendMessage: (content: string) => void;
    onLoadMoreMessages: () => void;
    canSendMessage: boolean;
    isLoadingMessages: boolean;
    hasMoreMessages: boolean;
}

/**
 * Props for the ChatMessage component
 */
interface ChatMessageProps {
    message: EventMessage;
    isOwnMessage: boolean;
}

/**
 * ChatMessage Component
 * 
 * Renders an individual chat message with user avatar, name, and timestamp.
 * Supports different styling for own messages vs other users' messages.
 * 
 * @component
 * @param {ChatMessageProps} props - Component props
 * @returns {JSX.Element} The rendered chat message
 */
const ChatMessage = React.memo(function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
    const textColor = useTextColor();
    const cardBackgroundColor = useCardBackgroundColor();

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
                    <UserAvatar
                        user={{ id: message.userId, name: message.userName, image: message.userImage }}
                        size={24}
                    />
                    <ThemedText style={styles.userName}>{message.userName}</ThemedText>
                </View>
            )}
            <View style={[
                styles.messageBubble,
                isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
                { backgroundColor: isOwnMessage ? '#007AFF' : cardBackgroundColor }
            ]}>
                <ThemedText style={[
                    styles.messageText,
                    { color: isOwnMessage ? '#FFFFFF' : textColor }
                ]}>
                    {message.content}
                </ThemedText>
            </View>
            <ThemedText style={styles.messageTime}>
                {formatTime(message.createdAt)}
            </ThemedText>
        </View>
    );
});

/**
 * TypingIndicator Component
 * 
 * Shows a visual indicator when users are typing in the chat.
 * Displays animated dots and user names for typing feedback.
 * 
 * @component
 * @param {{ users: TypingUser[] }} props - Component props
 * @returns {JSX.Element | null} The rendered typing indicator or null
 */
const TypingIndicator = React.memo(function TypingIndicator({ users }: { users: TypingUser[] }) {
    const textColor = useTextColor();
    const cardBackgroundColor = useCardBackgroundColor();

    if (users.length === 0) return null;

    const displayText = users.length === 1
        ? `${users[0].userName} is typing...`
        : `${users.length} people are typing...`;

    return (
        <View style={[styles.typingContainer, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                    <View style={[styles.typingDot, { backgroundColor: textColor }]} />
                    <View style={[styles.typingDot, { backgroundColor: textColor }]} />
                    <View style={[styles.typingDot, { backgroundColor: textColor }]} />
                </View>
            </View>
            <ThemedText style={[styles.typingText, { color: textColor }]}>
                {displayText}
            </ThemedText>
        </View>
    );
});

/**
 * MessageInput Component
 * 
 * Provides a text input for sending messages with typing indicators,
 * send button, and character limits. Handles typing status updates
 * and message validation.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.value - Current input value
 * @param {(text: string) => void} props.onChangeText - Text change handler
 * @param {() => void} props.onSend - Send message handler
 * @param {() => void} props.onTyping - Typing start handler
 * @param {() => void} props.onStopTyping - Typing stop handler
 * @param {boolean} props.disabled - Whether input is disabled
 * @returns {JSX.Element} The rendered message input
 */
const MessageInput = React.memo(function MessageInput({
    value,
    onChangeText,
    onSend,
    onTyping,
    onStopTyping,
    disabled
}: {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    onTyping: () => void;
    onStopTyping: () => void;
    disabled: boolean;
}) {
    const textColor = useTextColor();
    const cardBackgroundColor = useCardBackgroundColor();
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const handleTextChange = (text: string) => {
        onChangeText(text);

        if (text.length > 0) {
            onTyping();

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set new timeout to stop typing indicator
            typingTimeoutRef.current = setTimeout(() => {
                onStopTyping();
            }, 2000);
        } else {
            onStopTyping();
        }
    };

    const handleSend = () => {
        if (value.trim() && !disabled) {
            onSend();
            // Clear typing timeout when sending
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            onStopTyping();
        }
    };

    return (
        <View style={[styles.inputContainer, { backgroundColor: cardBackgroundColor }]}>
            <TextInput
                style={[styles.textInput, { color: textColor }]}
                value={value}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor={textColor + '80'}
                multiline
                maxLength={500}
                editable={!disabled}
            />
            <TouchableOpacity
                style={[
                    styles.sendButton,
                    { backgroundColor: value.trim() && !disabled ? '#007AFF' : '#E5E5EA' }
                ]}
                onPress={handleSend}
                disabled={!value.trim() || disabled}
            >
                <ThemedText style={[
                    styles.sendButtonText,
                    { color: value.trim() && !disabled ? '#FFFFFF' : '#8E8E93' }
                ]}>
                    Send
                </ThemedText>
            </TouchableOpacity>
        </View>
    );
});

/**
 * ChatSection Component
 * 
 * Main chat interface for event participants. Provides real-time messaging,
 * typing indicators, message history, and input controls. Supports
 * pagination for loading older messages and read-only mode for non-participants.
 * 
 * Features:
 * - Real-time message display with user avatars and timestamps
 * - Typing indicators with animated dots
 * - Message input with character limits and send button
 * - Pagination for loading older messages
 * - Read-only mode for non-participants
 * - Haptic feedback for message sending
 * - Keyboard-aware layout
 * 
 * @component
 * @param {ChatSectionProps} props - Component props
 * @returns {JSX.Element} The rendered chat section
 */
export const ChatSection = React.memo(function ChatSection({
    eventId,
    messages,
    typingUsers,
    onSendMessage,
    onLoadMoreMessages,
    canSendMessage,
    isLoadingMessages,
    hasMoreMessages,
}: ChatSectionProps) {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const flatListRef = useRef<FlatList<EventMessage>>(null);
    const backgroundColor = useBackgroundColor();
    const textColor = useTextColor();
    const { user } = useAuth();

    const { sendMessage, startTyping, stopTyping } = useSocket();

    // Auto-scroll to bottom when keyboard appears
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                // Small delay to ensure keyboard is fully shown
                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }, 100);
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                // Optional: scroll back to top when keyboard hides
            }
        );

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
    }, [messages.length]);

    const handleSend = async () => {
        if (!inputText.trim() || isSending) return;

        const content = inputText.trim();
        setInputText('');
        setIsSending(true);

        // Add haptic feedback for message sending
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            // Send via Socket.IO for real-time
            sendMessage(eventId, content);

            // Also call the callback for API fallback
            await onSendMessage(content);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Optionally show error message to user
        } finally {
            setIsSending(false);
        }
    };

    const handleTyping = () => {
        startTyping(eventId);
    };

    const handleStopTyping = () => {
        stopTyping(eventId);
    };

    // Wrapper function for MessageInput that doesn't require arguments
    const handleStopTypingWrapper = () => {
        handleStopTyping();
    };

    const renderMessage = useCallback(({ item }: { item: EventMessage }) => {
        const currentUserId = user?.id;
        const isOwnMessage = item.userId === currentUserId;

        return (
            <ChatMessage
                message={item}
                isOwnMessage={isOwnMessage}
            />
        );
    }, [user?.id]);

    const keyExtractor = useCallback((item: EventMessage) => item.id, []);

    const renderFooter = () => {
        if (!hasMoreMessages) return null;

        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={textColor} />
                <ThemedText style={styles.loadingText}>Loading more messages...</ThemedText>
            </View>
        );
    };

    const handleEndReached = () => {
        if (hasMoreMessages && !isLoadingMessages) {
            onLoadMoreMessages();
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.messagesContainer}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={keyExtractor}
                    inverted
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.1}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={styles.messagesList}
                />

                <TypingIndicator users={typingUsers} />
            </View>

            {canSendMessage ? (
                <MessageInput
                    value={inputText}
                    onChangeText={setInputText}
                    onSend={handleSend}
                    onTyping={handleTyping}
                    onStopTyping={handleStopTypingWrapper}
                    disabled={isSending}
                />
            ) : (
                <View style={styles.readOnlyContainer}>
                    <ThemedText style={[styles.readOnlyText, { color: textColor }]}>
                        Join the event to participate in chat
                    </ThemedText>
                </View>
            )}
        </KeyboardAvoidingView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesList: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
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
        marginBottom: 4,
        marginLeft: 4,
    },
    userName: {
        fontSize: 12,
        marginLeft: 8,
        opacity: 0.7,
    },
    messageBubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        maxWidth: '100%',
    },
    ownMessageBubble: {
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
        marginHorizontal: 4,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    typingBubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        marginRight: 8,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 1,
        opacity: 0.6,
    },
    typingText: {
        fontSize: 12,
        opacity: 0.7,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    textInput: {
        flex: 1,
        minHeight: 36,
        maxHeight: 100,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        marginRight: 8,
        fontSize: 16,
    },
    sendButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        minWidth: 60,
        alignItems: 'center',
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    readOnlyContainer: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    readOnlyText: {
        fontSize: 16,
        opacity: 0.7,
        textAlign: 'center',
    },
    loadingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        opacity: 0.7,
    },
}); 