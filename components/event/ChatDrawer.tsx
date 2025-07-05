import { useAuth } from '@/components/AuthProvider';
import { useSocket } from '@/components/providers/SocketProvider';
import { ThemedText } from '@/components/ThemedText';
import { useBackgroundColor, useCardBackgroundColor, useTextColor } from '@/hooks/useThemeColor';
import { EventMessage, TypingUser } from '@/lib/socket-client';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { UserAvatar } from './UserAvatar';

/**
 * Props for the ChatDrawer component
 */
interface ChatDrawerProps {
    eventId: string;
    messages: EventMessage[];
    typingUsers: TypingUser[];
    onSendMessage: (content: string) => void;
    onLoadMoreMessages: () => void;
    canSendMessage: boolean;
    isLoadingMessages: boolean;
    hasMoreMessages: boolean;
    isSignedIn?: boolean;
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
                    backgroundColor: isOwnMessage ? '#007AFF' : cardBackgroundColor,
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
    const cardBackgroundColor = useCardBackgroundColor();

    if (users.length === 0) return null;

    const displayText = users.length === 1
        ? `${users[0].userName} is typing...`
        : `${users.length} people are typing...`;

    return (
        <View style={styles.typingContainer}>
            <View style={[
                styles.typingBubble,
                {
                    backgroundColor: cardBackgroundColor,
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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    return (
        <View style={styles.inputContainer}>
            <View style={[
                styles.textInputContainer,
                {
                    backgroundColor: cardBackgroundColor,
                    borderColor: '#E5E5EA',
                }
            ]}>
                <BottomSheetTextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={value}
                    onChangeText={handleTextChange}
                    placeholder="Type a message..."
                    placeholderTextColor={textColor + '80'}
                    multiline
                    maxLength={500}
                    editable={!disabled}
                />
            </View>
            <TouchableOpacity
                style={[
                    styles.sendButton,
                    {
                        backgroundColor: value.trim() && !disabled ? '#007AFF' : '#E5E5EA',
                    }
                ]}
                onPress={handleSend}
                disabled={!value.trim() || disabled}
            >
                <ThemedText style={[
                    styles.sendButtonText,
                    {
                        color: value.trim() && !disabled ? '#FFFFFF' : '#8E8E93',
                    }
                ]}>
                    Send
                </ThemedText>
            </TouchableOpacity>
        </View>
    );
});

// Static blur backdrop when the sheet is open
const StaticBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
    >
        <BlurView tint="default" intensity={20} style={StyleSheet.absoluteFill} />
    </BottomSheetBackdrop>
);

/**
 * ChatDrawer Component
 * 
 * A bottom sheet modal that contains the full chat interface.
 * Features real-time messaging, typing indicators, and smooth animations.
 * 
 * @component
 * @param {ChatDrawerProps} props - Component props
 * @returns {JSX.Element} The rendered chat drawer
 */
export const ChatDrawer = forwardRef<{ present: () => void; dismiss: () => void }, ChatDrawerProps>(
    function ChatDrawer({
        eventId,
        messages,
        typingUsers,
        onSendMessage,
        onLoadMoreMessages,
        canSendMessage,
        isLoadingMessages,
        hasMoreMessages,
        isSignedIn = true,
    }, ref) {
        const { user } = useAuth();
        const { startTyping, stopTyping } = useSocket();
        const backgroundColor = useBackgroundColor();
        const textColor = useTextColor();

        // Bottom sheet ref and snap points
        const bottomSheetModalRef = useRef<BottomSheetModal>(null);
        const snapPoints = React.useMemo(() => ['70%'], []);

        // Input state
        const [inputText, setInputText] = useState('');
        const [isSending, setIsSending] = useState(false);

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            present: () => {
                bottomSheetModalRef.current?.present();
            },
            dismiss: () => {
                bottomSheetModalRef.current?.dismiss();
            },
        }), []);

        const handleSend = async () => {
            if (!inputText.trim() || isSending) return;

            try {
                setIsSending(true);
                await onSendMessage(inputText.trim());
                setInputText('');
            } catch (error) {
                console.error('Failed to send message:', error);
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

        const handleStopTypingWrapper = () => {
            handleStopTyping();
        };

        const renderMessage = useCallback(({ item }: { item: EventMessage }) => {
            const isOwnMessage = user && user.id ? item.userId === user.id : false;
            return (
                <ChatMessage
                    message={item}
                    isOwnMessage={isOwnMessage}
                />
            );
        }, [user]);

        const keyExtractor = useCallback((item: EventMessage) => item.id, []);
        const flatListRef = useRef<any>(null);

        // Auto-scroll to bottom when new messages arrive
        useEffect(() => {
            if (messages.length > 0) {
                // Use setTimeout to ensure the message is rendered before scrolling
                setTimeout(() => {
                    if (flatListRef.current && typeof flatListRef.current.scrollToEnd === 'function') {
                        flatListRef.current.scrollToEnd({ animated: true });
                    }
                }, 100);
            }
        }, [messages.length]);

        const renderFooter = () => {
            if (!hasMoreMessages) return null;

            return (
                <View style={styles.loadingFooter}>
                    <ActivityIndicator size="small" color={textColor} />
                    <ThemedText style={styles.loadingText}>Loading more messages...</ThemedText>
                </View>
            );
        };

        return (
            <BottomSheetModal
                ref={bottomSheetModalRef}
                index={0}
                snapPoints={snapPoints}
                backgroundStyle={[styles.bottomSheetBackground, { backgroundColor }]}
                handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: textColor + '40' }]}
                enablePanDownToClose={true}
                enableDismissOnClose={true}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={true}
                backdropComponent={StaticBackdrop}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <BottomSheetView style={[styles.container, { backgroundColor }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                                Event Chat
                            </ThemedText>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => bottomSheetModalRef.current?.dismiss()}
                            >
                                <ThemedText style={[styles.closeButtonText, { color: textColor }]}>
                                    ✕
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        {/* Messages Container (max 50% screen height) */}
                        <View style={[
                            styles.messagesContainer,
                            { backgroundColor, maxHeight: Dimensions.get('window').height * 0.5 }
                        ]}>
                            <BottomSheetFlatList
                                ref={flatListRef}
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={keyExtractor}
                                showsVerticalScrollIndicator={false}
                                // @ts-ignore – onScroll is omitted from type definitions but still works
                                onScroll={({ nativeEvent }) => {
                                    const { contentOffset } = nativeEvent;
                                    if (contentOffset.y <= 10 && hasMoreMessages && !isLoadingMessages) {
                                        onLoadMoreMessages();
                                    }
                                }}
                                // @ts-ignore – property omitted in types
                                scrollEventThrottle={16}
                                ListHeaderComponent={renderFooter}
                                contentContainerStyle={styles.messagesList}
                                removeClippedSubviews={false}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                                initialNumToRender={10}
                                style={{ flex: 1 }}
                            />

                            {/* Typing indicator fixed inside scroll */}
                            <TypingIndicator users={typingUsers} />
                        </View>

                        {/* Input Container */}
                        <View style={[styles.inputWrapper, { backgroundColor }]}>
                            {canSendMessage && isSignedIn ? (
                                <MessageInput
                                    value={inputText}
                                    onChangeText={setInputText}
                                    onSend={handleSend}
                                    onTyping={handleTyping}
                                    onStopTyping={handleStopTypingWrapper}
                                    disabled={isSending}
                                />
                            ) : isSignedIn ? (
                                <View style={styles.readOnlyContainer}>
                                    <ThemedText style={[styles.readOnlyText, { color: textColor }]}>
                                        Join the event to participate in chat
                                    </ThemedText>
                                </View>
                            ) : null}
                        </View>
                    </BottomSheetView>
                </KeyboardAvoidingView>
            </BottomSheetModal>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    bottomSheetBackground: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handleIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: '500',
    },
    messagesContainer: {
        flex: 1,
        paddingBottom: 80, // Keep space for absolute input bar
    },
    messagesList: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    messageContainer: {
        marginVertical: 3,
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
    inputWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5EA',
        justifyContent: 'center',
        height: 80,
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
    },
    readOnlyContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'center',
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