# Who-All: Intelligent Event Generation System

Who-All is an AI-powered event generation system that creates personalized events for users based on their interests, locations, and social connections. The system uses advanced clustering algorithms, natural language processing, and Google Places Text Search to generate relevant events with optimal venues.

## 🚀 Features

- **AI-Powered User Clustering**: Groups users by interest similarity using HDBSCAN
- **Intelligent Event Generation**: Creates event descriptions using OpenAI GPT
- **Smart Venue Selection**: Uses Google Places Text Search with semantic scoring
- **Personalized Recommendations**: Matches users to events using embedding similarity
- **Real-time Chat Analysis**: Summarizes conversations to extract user interests

## 🏗️ System Architecture

### Core Components

1. **User Interest Analysis**
   - Extracts and embeds user interests using OpenAI embeddings
   - Clusters users by interest similarity using HDBSCAN
   - Identifies centroid users for event generation

2. **Event Generation Pipeline**
   - Generates event descriptions using OpenAI GPT
   - Extracts venue type queries from descriptions
   - Creates pseudo-events with location and metadata

3. **Venue Selection System**
   - Uses Google Places Text Search API for natural language venue queries
   - Implements semantic scoring for venue selection
   - Considers venue type match, rating, and distance

4. **Event Recommendation Engine**
   - Matches users to events using embedding similarity
   - Provides personalized event recommendations
   - Tracks user interactions and feedback

## 🛠️ Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: OpenAI GPT-4 and Embeddings
- **APIs**: Google Places Text Search API
- **Clustering**: HDBSCAN algorithm
- **Testing**: Vitest

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Google Places API key

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/who-all2.git
cd who-all2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/who_all"

# OpenAI
OPENAI_API_KEY="your_openai_api_key"

# Google Places
GOOGLE_PLACES_API_KEY="your_google_places_api_key"
```

### 4. Database Setup
```bash
# Generate and run migrations
npm run db:generate
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 5. Start the Development Server
```bash
# Start the Expo development server
npm start

# Or run on specific platform
npm run ios
npm run android
npm run web
```

## 🧪 Testing

### Run All Tests
```bash
npm run test:all
```

### Individual Test Suites
```bash
# Core functionality tests
npm run test:venue-search           # Test venue search functionality
npm run test:event-generation       # Test event generation pipeline
npm run test:chat-summarization     # Test chat analysis
npm run test:pseudo-events          # Test pseudo-event generation

# API and database tests
npm run test:api-endpoints          # Test API endpoints
npm run test:database-connection    # Test database operations
npm run test:interest-schemas       # Test interest schemas
npm run test:zod                    # Test validation schemas
```

### Watch Mode
```bash
npm run test:watch
```

## 📚 Usage

### Event Generation

#### Generate Pseudo-Events
```bash
npm run generate-pseudo-events
```

This script:
1. Clusters users by interest similarity
2. Generates event descriptions for each cluster
3. Extracts venue type queries
4. Creates pseudo-events ready for venue selection

#### Generate Real Events
```bash
npm run test:event-generation
```

This script:
1. Takes pseudo-events as input
2. Searches for venues using Google Places Text Search
3. Scores venues using semantic matching
4. Creates real events with selected venues

### Venue Search Testing
```bash
npm run test:venue-search
```

Tests the venue search functionality with sample queries:
- Coffee shop search
- Restaurant search  
- Rock climbing gym search

### Database Operations
```bash
# Generate new migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Open database studio
npm run db:studio
```

### User Seeding
The system provides flexible user seeding with configurable user counts:

#### Basic Seeding
```bash
# Seed all available users (45 users, 225 messages)
npm run seed:users

# Seed with custom count
npm run seed:users -- --users=10
```

#### Predefined User Counts
```bash
# Small dataset (10 users, 50 messages)
npm run seed:users:small

# Medium dataset (20 users, 100 messages)  
npm run seed:users:medium

# Large dataset (30 users, 150 messages)
npm run seed:users:large

# All users (45 users, 225 messages)
npm run seed:users:all
```

#### Testing with Seeded Users
```bash
# Test full pipeline with small dataset
npm run test:with-seed:small

# Test full pipeline with medium dataset
npm run test:with-seed:medium

# Test full pipeline with large dataset
npm run test:with-seed:large

# Test full pipeline with all users
npm run test:with-seed:all
```

#### Running the Full Pipeline (Keep Events)
```bash
# Run full pipeline with existing users (keeps events in database)
npm run run:full-pipeline

# Run full pipeline with small dataset (10 users)
npm run run:with-seed:small

# Run full pipeline with medium dataset (20 users)
npm run run:with-seed:medium

# Run full pipeline with large dataset (30 users)
npm run run:with-seed:large

# Run full pipeline with all users (45 users)
npm run run:with-seed:all
```

**Note**: The `run:` commands keep events in the database, while `test:` commands clean up afterward.

**Features:**
- **Automatic Cleanup**: Removes existing seeded users before creating new ones
- **Diverse User Profiles**: 45 users across 11 interest clusters
- **Realistic Data**: Each user has 5 messages with varied timestamps
- **Geographic Distribution**: Users spread across NYC locations
- **Interest Clusters**: Fitness, Creative Arts, Technology, Food, Music, Education, Outdoor, Business, Science, Activism, Travel

## 📊 API Endpoints

### Event Management
- `POST /api/events/generate` - Generate new events from user clusters
- `POST /api/events/recommendations` - Get personalized event recommendations
- `GET /api/events` - List all events

### User Management
- `POST /api/users/interests` - Update user interests
- `GET /api/users/recommendations` - Get user-specific recommendations

### Chat Integration
- `POST /api/chat/summarize` - Summarize chat conversations
- `POST /api/chat/analyze` - Analyze chat for event opportunities

## 🔧 Configuration

### Event Generation Settings
```typescript
const EVENT_CONFIG = {
    DEFAULT_RADIUS_METERS: 5000,      // 5km search radius
    MIN_CLUSTER_SIZE: 20,             // Minimum users per cluster
    MAX_EVENTS_PER_CLUSTER: 1,        // Events per cluster
    VENUE_SEARCH_LIMIT: 20,           // Max venues to search
    VENUE_ANALYSIS_LIMIT: 10,         // Max venues to score
};
```

### Venue Scoring Settings
```typescript
const VENUE_SCORING_CONFIG = {
    VENUE_TYPE_WEIGHT: 0.4,           // Weight for semantic match
    RATING_WEIGHT: 0.2,               // Weight for venue rating
    DISTANCE_WEIGHT: 0.2,             // Weight for distance
    PRICE_WEIGHT: 0.2,                // Weight for price level
    SCORE_THRESHOLD: 0.3,             // Minimum acceptable score
    VENUE_IDEAL_SCORE_THRESHOLD: 0.9, // Ideal score threshold
    VENUE_MAX_DETAIL_FETCHES: 10,     // Max venues to analyze
};
```

## 📁 Project Structure

```
who-all2/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Core library code
│   ├── db/               # Database schema and migrations
│   ├── embeddings.ts     # OpenAI embedding utilities
│   ├── google-places.ts  # Google Places API integration
│   ├── pseudo-events.ts  # Pseudo-event generation
│   └── event-generation.ts # Event generation pipeline
├── scripts/              # Utility scripts
│   ├── generate-pseudo-events.ts
│   ├── test-venue-search.ts
│   └── seed-events.ts
├── tests/                # Test files
└── specs/                # System specifications
```

## 🔍 Key Algorithms

### Venue Selection Algorithm
The venue selection uses a weighted scoring system:

1. **Venue Type Match (40%)**: Semantic similarity between query and venue
2. **Rating Score (20%)**: Normalized venue rating (0-5 scale)
3. **Distance Score (20%)**: Proximity to target location
4. **Price Level (20%)**: Affordability consideration

### User Clustering
- Uses HDBSCAN algorithm for density-based clustering
- Cosine similarity for interest comparison
- Automatic cluster size detection
- Handles outliers gracefully

### Event Generation
- OpenAI GPT-4 for event description generation
- Multiple descriptions per cluster for selection
- Embedding-based similarity for best event selection
- Natural language venue type extraction

## 🚨 Error Handling

### API Failures
- Exponential backoff for retries
- Graceful fallbacks for failed requests
- Comprehensive error logging

### Database Issues
- Connection pooling for reliability
- Transaction rollback on failures
- Data validation before storage

### AI Service Issues
- Fallback to keyword matching if embeddings fail
- Retry logic for OpenAI API calls
- Default values for missing data

## 📈 Performance Considerations

### Optimization Strategies
1. **Embedding Caching**: Cache user and event embeddings
2. **Batch Processing**: Process multiple events concurrently
3. **API Rate Limiting**: Respect Google Places API limits
4. **Database Indexing**: Optimize queries with proper indexes

### Monitoring
- Track API response times
- Monitor embedding generation costs
- Log venue selection success rates
- Measure user engagement metrics

## 🔮 Future Enhancements

### Planned Features
1. **Multi-language Support**: International venue search
2. **Advanced Filtering**: Price, accessibility, and preference filters
3. **Real-time Updates**: Live venue availability checking
4. **Social Integration**: Event sharing and RSVP management
5. **Analytics Dashboard**: Event performance metrics

### Technical Improvements
1. **Vector Database**: Optimize embedding storage and search
2. **Caching Layer**: Redis for frequently accessed data
3. **Background Jobs**: Async event generation processing
4. **API Versioning**: Maintain backward compatibility

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [documentation](specs/) for detailed specifications
- Review the test files for usage examples

## 🙏 Acknowledgments

- OpenAI for GPT-4 and embedding models
- Google for Places API
- Expo team for the React Native framework
- Drizzle team for the ORM
- HDBSCAN authors for the clustering algorithm
