# Event Page User Guide

## Overview

The event page is the central hub for event interaction in Who-All. It provides a comprehensive view of event details, real-time chat functionality, and participation management. This guide covers all the features and how to use them effectively.

## Navigation

### Accessing Event Pages
- **From Events List**: Tap any event card to navigate to the event page
- **Direct URL**: Navigate directly to `/event/[event-id]`
- **Back Navigation**: Use the back button or swipe gesture to return to the events list

## Event Information Display

### Header Section
The event header features a large hero image with parallax scrolling effect:
- **Event Photo**: High-quality venue or event image
- **Parallax Effect**: Image moves at different speed than content for depth
- **Event Title**: Prominently displayed at the top

### Event Details
Comprehensive event information is displayed in an organized layout:
- **Date & Time**: Formatted as "Today", "Tomorrow", or specific date
- **Venue Information**: 
  - Venue name (clickable for Google Maps)
  - Address and neighborhood
  - Rating (out of 5 stars)
  - Price level (1-4 scale)
- **Event Description**: Full event details and information
- **Category Badges**: Visual indicators for event categories (e.g., "Fitness", "Social")

## Participation Management

### Join/Leave Controls
Two participation options are available for each event:

#### Attending
- **Purpose**: Indicates you plan to attend the event
- **Button**: Blue "Join" button in the Attending section
- **Action**: Tap to join as attending, tap again to leave
- **Visual Feedback**: Button shows "Joined" when participating

#### Interested
- **Purpose**: Indicates interest in the event without commitment
- **Button**: Gray "Interested" button in the Interested section
- **Action**: Tap to mark as interested, tap again to remove interest
- **Visual Feedback**: Button shows "Interested" when marked

### Participation States
- **Not Participating**: Can view event details but cannot chat
- **Attending**: Full access to chat and attendee lists
- **Interested**: Full access to chat and attendee lists

### Real-time Updates
- **Live Counts**: Attendee counts update in real-time
- **Visual Indicators**: "You" badge appears next to your participation status
- **Optimistic Updates**: UI updates immediately, then syncs with server

## Attendee Lists

### Attending Section
- **Header**: Shows "Attending (count)" with join button
- **Avatar Grid**: Overlapping circular avatars of attendees
- **Expandable**: Tap to see more attendees if list is long
- **User Interaction**: Tap avatars to see user names

### Interested Section
- **Header**: Shows "Interested (count)" with interested button
- **Avatar Grid**: Overlapping circular avatars of interested users
- **Same Features**: Expandable list and user interaction

### Avatar Features
- **Profile Pictures**: User profile images when available
- **Default Avatars**: Fallback images for users without photos
- **Overlap Effect**: 50% overlap for compact display
- **User Names**: Displayed on avatar press

## Real-time Chat

### Chat Interface
The chat section provides a modern messaging experience:

#### Message Display
- **Message Bubbles**: WhatsApp-style message bubbles
- **Own Messages**: Blue bubbles on the right
- **Other Messages**: Gray bubbles on the left
- **User Information**: Avatar and name for other users
- **Timestamps**: Absolute time for each message

#### Message Input
- **Text Input**: Multi-line text input with character limit
- **Send Button**: Blue button that activates when text is entered
- **Character Limit**: 500 characters maximum
- **Validation**: Empty messages cannot be sent

### Real-time Features

#### Typing Indicators
- **Visual Feedback**: Animated dots when users are typing
- **User Names**: Shows who is currently typing
- **Multiple Users**: "X people are typing..." for multiple typers
- **Auto-clear**: Automatically disappears after 2 seconds of inactivity

#### Message History
- **Initial Load**: Last 20 messages loaded automatically
- **Infinite Scroll**: Pull up to load older messages
- **Loading Indicator**: Shows when fetching older messages
- **Chronological Order**: Messages displayed in time order

### Chat Permissions
- **Participants Only**: Only attending/interested users can send messages
- **Read Access**: All users can view messages
- **Permission Message**: Clear indication when chat is read-only

## Interactive Features

### Haptic Feedback
- **Button Presses**: Tactile feedback for all button interactions
- **Message Sending**: Feedback when messages are sent
- **Join/Leave**: Feedback for participation changes

### Loading States
- **Skeleton Loading**: Placeholder content while loading
- **Progress Indicators**: Loading spinners for actions
- **Error States**: Clear error messages with retry options

### Error Handling
- **Network Errors**: Graceful handling of connection issues
- **Permission Errors**: Clear messages for access restrictions
- **Validation Errors**: Helpful feedback for invalid input
- **Retry Mechanisms**: Easy retry for failed operations

## Performance Features

### Optimizations
- **Lazy Loading**: Images and content loaded as needed
- **Message Pagination**: Efficient loading of chat history
- **Avatar Caching**: Profile images cached for performance
- **Debounced Updates**: Optimized real-time updates

### Responsive Design
- **Screen Adaptation**: Works on all device sizes
- **Orientation Support**: Portrait and landscape modes
- **Keyboard Handling**: Proper layout with keyboard open
- **Touch Targets**: Adequate size for all interactive elements

## Accessibility

### Screen Reader Support
- **Semantic Labels**: Proper labels for all interactive elements
- **Navigation**: Logical tab order and focus management
- **Descriptive Text**: Clear descriptions for images and content

### Visual Accessibility
- **Color Contrast**: High contrast for text and buttons
- **Font Sizes**: Readable text sizes
- **Touch Targets**: Minimum 44pt touch targets
- **Visual Hierarchy**: Clear information hierarchy

## Troubleshooting

### Common Issues

#### Chat Not Working
- **Check Participation**: Ensure you're marked as attending or interested
- **Network Connection**: Verify internet connectivity
- **Socket Connection**: Check if real-time features are connected

#### Can't Join Event
- **Authentication**: Ensure you're signed in
- **Event Status**: Check if event is still active
- **Network Issues**: Try refreshing the page

#### Messages Not Sending
- **Character Limit**: Ensure message is under 500 characters
- **Participation Status**: Verify you're participating in the event
- **Network Connection**: Check internet connectivity

### Getting Help
- **Error Messages**: Read error messages for specific guidance
- **Retry Actions**: Use retry buttons for failed operations
- **Refresh Page**: Reload the page if experiencing issues
- **Contact Support**: Report persistent issues through the app

## Best Practices

### Participation
- **Choose Wisely**: Only mark as attending if you plan to go
- **Update Status**: Change status if your plans change
- **Be Respectful**: Don't spam join/leave actions

### Chat Etiquette
- **Be Respectful**: Keep messages appropriate and friendly
- **Stay On Topic**: Keep discussions relevant to the event
- **Don't Spam**: Avoid sending multiple messages rapidly
- **Use Emojis**: Add personality with appropriate emojis

### Performance
- **Close Unused Tabs**: Close event pages you're not actively using
- **Stable Connection**: Use stable internet for best experience
- **Regular Updates**: Keep the app updated for latest features

## Future Features

The event page is continuously evolving with planned enhancements:

### Upcoming Features
- **Image Sharing**: Send photos in chat messages
- **Event Reminders**: Get notifications before events
- **User Profiles**: Enhanced user profile viewing
- **Event Sharing**: Share events with friends
- **Advanced Search**: Search within event chats
- **Message Reactions**: React to messages with emojis
- **Voice Messages**: Send voice notes in chat
- **Event Polls**: Create polls for event planning

### Technical Improvements
- **Offline Support**: Basic functionality without internet
- **Push Notifications**: Real-time notifications for messages
- **Message Encryption**: Enhanced privacy for sensitive conversations
- **Performance Optimization**: Faster loading and smoother interactions 