## 🗄 Database Schema

The app uses a comprehensive database schema with the following main entities:

- **Users**: Authentication and profile management
- **Events**: Event details with categories, location, and attendance tracking
- **Messages**: Chat history for AI conversations
- **Event Interactions**: User engagement tracking (interested, going, not interested)
- **User Profiles**: Preferences and location settings

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Expo CLI
- PostgreSQL database (Neon recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd who-all2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Database Setup**
   ```bash
   # Generate and run migrations
   npm run db:generate
   npm run db:migrate
   
   # Seed with sample events
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm start
   ```

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:seed` - Seed database with sample events

## 🎨 Key Components

### Event Discovery
The main events screen (`app/(tabs)/index.tsx`) features:
- Category-based filtering
- Event cards with date/time formatting
- Location display with neighborhood information
- Attendance statistics
- Responsive design with proper loading states

### AI Chat Interface
The chat screen (`app/(tabs)/chat.tsx`) provides:
- Real-time messaging with AI assistant
- Message history persistence
- Authentication integration
- Responsive input handling

### Authentication
Secure authentication flow with:
- Email/password sign-in and sign-up
- Session management
- Protected routes
- Better Auth integration

## 🎯 Configuration

### App Configuration
The app is configured via `app.config.js` with:
- Expo settings for iOS, Android, and Web
- Custom scheme for deep linking
- Environment variable integration
- Splash screen and icon configuration

### Database Configuration
Database setup includes:
- Drizzle ORM configuration
- Migration management
- Type-safe schema definitions
- Connection pooling with Neon

## 🚀 Deployment

### Expo Build
```bash
# Build for production
expo build:ios
expo build:android
```

### Web Deployment
```bash
# Build for web
expo export:web
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the [Expo documentation](https://docs.expo.dev/)
- Review [Drizzle ORM docs](https://orm.drizzle.team/)
- Consult [Better Auth documentation](https://better-auth.com/)

---

Built with ❤️ using React Native and Expo
