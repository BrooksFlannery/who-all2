import { useSocket } from '@/components/providers/SocketProvider';
import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useBorderColor, useCardBackgroundColor, useMessageBackgroundColor, useSecondaryTextColor, useTextColor } from '@/hooks/useThemeColor';
import { EventMessage, TypingUser } from '@/lib/socket-client';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
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
                    <UserAvatar
                        user={{ id: message.userId, name: message.userName, image: message.userImage }}
                        size={20}
                        showBorder={false}
                    />
                    <ThemedText style={[styles.userName, { color: textColor }]}>{message.userName}</ThemedText>
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
                {formatTime(message.createdAt)}
            </ThemedText>
        </View>
    );
});

/**
 * TypingIndicator Component
 * 
 * Shows a visual indicator when users are typing in the chat.
 * Features Apple-like animated dots and refined styling.
 * 
 * @component
 * @param {{ users: TypingUser[] }} props - Component props
 * @returns {JSX.Element | null} The rendered typing indicator or null
 */
const TypingIndicator = React.memo(function TypingIndicator({ users }: { users: TypingUser[] }) {
    const textColor = useTextColor();
    const messageBackgroundColor = useMessageBackgroundColor();

    if (users.length === 0) return null;

    const displayText = users.length === 1
        ? `${users[0].userName} is typing...`
        : `${users.length} people are typing...`;

    return (
        <View style={styles.typingContainer}>
            <View style={[
                styles.typingBubble,
                {
                    backgroundColor: messageBackgroundColor,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                }
            ]}>
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
 * Provides a text input for sending messages with Apple-like design.
 * Features refined styling, subtle shadows, and elegant interactions.
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
    const borderColor = useBorderColor();
    const secondaryTextColor = useSecondaryTextColor();
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSend();
            // Clear typing timeout when sending
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            onStopTyping();
        }
    };

    return (
        <View style={[
            styles.inputContainer,
            {
                backgroundColor: cardBackgroundColor,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
            }
        ]}>
            <View style={[
                styles.textInputContainer,
                {
                    backgroundColor: cardBackgroundColor,
                    borderColor: borderColor,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                }
            ]}>
                <TextInput
                    style={[
                        styles.textInput,
                        {
                            color: textColor,
                            backgroundColor: cardBackgroundColor,
                        }
                    ]}
                    value={value}
                    onChangeText={handleTextChange}
                    placeholder="Type a message..."
                    placeholderTextColor={secondaryTextColor}
                    multiline
                    maxLength={500}
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
    const flatListRef = useRef<FlatList>(null);
    const backgroundColor = useBackgroundColor();
    const borderColor = useBorderColor();

    const { sendMessage, startTyping, stopTyping } = useSocket();

    const renderMessage = useCallback(({ item }: { item: EventMessage }) => {
        const isOwnMessage = item.userId === 'current-user'; // You'll need to get the actual current user ID
        return <ChatMessage message={item} isOwnMessage={isOwnMessage} />;
    }, []);

    const keyExtractor = useCallback((item: EventMessage) => item.id, []);

    const handleSend = async () => {
        if (inputText.trim() && !isSending) {
            const messageToSend = inputText;
            setInputText('');
            setIsSending(true);

            try {
                await onSendMessage(messageToSend);
            } catch (error) {
                console.error('Failed to send message:', error);
                // Optionally restore the message text on error
                setInputText(messageToSend);
            } finally {
                setIsSending(false);
            }
        }
    };

    const handleTyping = () => {
        // This would typically emit a typing event via socket
        console.log('User started typing');
    };

    const handleStopTyping = () => {
        // This would typically emit a stop typing event via socket
        console.log('User stopped typing');
    };

    const handleStopTypingWrapper = () => {
        handleStopTyping();
    };

    const renderFooter = () => {
        if (isLoadingMessages) {
            return (
                <View style={styles.loadingFooter}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>Loading messages...</ThemedText>
                </View>
            );
        }
        return null;
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
                    nestedScrollEnabled={true}
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
                <View style={[styles.readOnlyContainer, { borderTopColor: borderColor }]}>
                    <ThemedText style={styles.readOnlyText}>
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
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    typingBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomLeftRadius: 6,
        marginRight: 10,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    typingDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        opacity: 0.4,
    },
    typingText: {
        fontSize: 11,
        opacity: 0.6,
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
    readOnlyContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'center',
        borderTopWidth: 0.5,
    },
    readOnlyText: {
        fontSize: 15,
        opacity: 0.6,
        textAlign: 'center',
        fontWeight: '400',
    },
    loadingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 10,
        fontSize: 13,
        opacity: 0.6,
        fontWeight: '400',
    },
}); 