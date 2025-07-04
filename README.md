# Who-All: Chat-Driven Event Recommender

A React Native app where NYC users chat with an AI assistant that learns their interests over time and recommends relevant in-person events based on semantic similarity.

## 🎯 Overview

Who-All is an intelligent event discovery platform that uses conversational AI to understand user preferences and automatically match them with compatible events and people in NYC. Instead of manual profile setup, users simply chat naturally with our AI assistant, which builds a comprehensive interest profile through conversation.

## ✨ Key Features

- **Conversational Interest Discovery**: Chat with an AI assistant that naturally extracts your interests through friendly conversation
- **Semantic Event Matching**: Advanced embedding-based matching using OpenAI's text-embedding-3-small model
- **Personalized Event Recommendations**: AI-powered event suggestions based on your chat history and interests
- **Automatic Event Generation**: System creates events based on interest clusters and public NYC locations
- **Privacy-First Design**: Your chat history and interests are private, with controlled visibility of other attendees

## 🚀 How It Works

1. **Sign Up & Chat**: Create an account and start chatting with our AI assistant
2. **Interest Building**: The AI learns your preferences through natural conversation
3. **Profile Generation**: Your interests are summarized and converted to vector embeddings
4. **Event Matching**: System finds events with high semantic similarity to your interests
5. **Event Discovery**: Browse and join events that match your profile
6. **Pseudo-Event Generation**: System automatically creates events based on user interest clusters

## 🏗️ Technical Architecture

### Core Components

- **AI Assistant**: GPT-powered conversational interface for interest discovery
- **Embedding Engine**: OpenAI embeddings for user interests and event descriptions
- **Matching Algorithm**: Cosine similarity-based event recommendations
- **Event Generator**: Automated event creation based on interest clusters
- **Pseudo-Event System**: HDBSCAN clustering + OpenAI event generation

### Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with Express
- **Database**: SQLite with Drizzle ORM
- **AI**: OpenAI GPT and Embeddings API
- **Authentication**: Custom auth system

## 📱 User Flow

```
Sign Up → Chat with AI → Build Interest Profile → Get Event Recommendations → Join Events
```

## 🔐 Privacy & Data

- Account required for all features
- Chat history and interest summaries are private
- User visibility controlled by privacy settings
- Full account deletion removes all personal data

## 🎯 MVP Success Criteria

- Users feel the AI understands their interests
- Events are relevant and accurately matched
- Users successfully join events from recommendations
- Embedding system outperforms manual tagging

## 🚧 Development Status

This is an MVP (Minimum Viable Product) with the following scope:

### ✅ In Scope
- User authentication
- AI chat interface
- Interest profile building
- Event matching and recommendations
- Basic event management

### 🚫 Out of Scope (Future Versions)
- Calendar integration
- Group chat features
- User-submitted events
- Friend system
- Push notifications

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/who-all2.git
cd who-all2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your OpenAI API key and other configuration
```

4. Run the development server:
```bash
npx expo start
```

5. Generate pseudo-events (optional):
```bash
npm run generate-pseudo-events
```

## 🤖 Pseudo-Event Generation

The system automatically generates events based on user interest clusters:

### How It Works
1. **User Clustering**: HDBSCAN algorithm groups users with similar interests
2. **Centroid Selection**: Finds the most representative users in each cluster
3. **Event Generation**: OpenAI creates diverse event descriptions based on cluster interests
4. **Event Selection**: Embedding similarity selects the best event for each cluster
5. **Venue Matching**: AI extracts appropriate venue types for each event

### Running Pseudo-Event Generation
```bash
npm run generate-pseudo-events
```

This script will:
- Cluster users by interest embeddings
- Generate 5 event descriptions per cluster
- Select the best event via embedding similarity
- Extract appropriate venue types
- Output detailed statistics and results

## 📊 Data Models
```typescript
{
  id: string
  name: string
  location: string
  interestSummary: string
  interestEmbedding: float[]
  chatHistory: Message[]
  createdAt: Date
}
```

### Event
```typescript
{
  id: string
  title: string
  description: string
  location: string
  date: Date
  creator: "system"
  eventEmbedding: float[]
  interestedUserIds: string[]
  createdAt: Date
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@who-all.com or join our Discord community.

---

Built with ❤️ for the NYC community
