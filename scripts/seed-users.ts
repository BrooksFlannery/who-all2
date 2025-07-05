import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { message, user } from '../lib/db/schema';
import { updateUserInterestEmbedding } from '../lib/embeddings';
import { validateEnv } from '../lib/validation';

// CLI argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    const userCountArg = args.find(arg => arg.startsWith('--users=') || arg.startsWith('-u='));

    if (userCountArg) {
        const count = parseInt(userCountArg.split('=')[1]);
        if (isNaN(count) || count < 1) {
            console.error('❌ Invalid user count. Must be a positive number.');
            console.error('Usage: npm run seed:users -- --users=10');
            process.exit(1);
        }
        return count;
    }

    // Default to all users if no argument provided
    return -1; // -1 means "all users"
}

// Parse user count from CLI arguments
const requestedUserCount = parseArguments();

// Validate environment variables
const env = validateEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

// Create database connection
const sql = neon(databaseUrl);
const db = drizzle(sql);

// Types for mock data
interface MockUser {
    id: string;
    name: string;
    email: string;
    interests: string[];
    location: { lat: number; lng: number };
    messages: string[];
    image?: string;
}

interface MockMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

/**
 * Clean up existing seeded users and their associated messages
 * @returns Promise<number> - Number of users cleaned up
 */
async function cleanupExistingSeededUsers(): Promise<number> {
    if (!db) {
        throw new Error('Database not available');
    }

    try {
        // Find all users with seeded pattern
        const seededUsers = await db.select()
            .from(user)
            .where(like(user.id, 'seed-%'));

        if (seededUsers.length === 0) {
            console.log('🧹 No existing seeded users found');
            return 0;
        }

        // Delete associated messages first
        for (const seededUser of seededUsers) {
            await db.delete(message)
                .where(eq(message.userId, seededUser.id));
        }

        // Delete seeded users
        await db.delete(user)
            .where(like(user.id, 'seed-%'));

        console.log(`🧹 Cleaned up ${seededUsers.length} existing seeded users and their messages`);
        return seededUsers.length;
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

/**
 * Get a subset of mock users based on the requested count
 * @param count - Number of users to return (-1 for all users)
 * @returns Array of mock users
 */
function getUsersToSeed(count: number): MockUser[] {
    if (count === -1) {
        // Return all users
        return mockUsers;
    }

    if (count > mockUsers.length) {
        console.warn(`⚠️ Requested ${count} users, but only ${mockUsers.length} are available. Using all users.`);
        return mockUsers;
    }

    // Return first N users, maintaining diversity across clusters
    return mockUsers.slice(0, count);
}

// Mock user data - diverse profiles across different interest clusters
const mockUsers: MockUser[] = [
    // Fitness & Wellness Cluster
    {
        id: 'seed-fitness-1',
        name: 'Sarah Chen',
        email: 'sarah.chen@example.com',
        interests: ['yoga', 'meditation', 'healthy eating', 'mindfulness'],
        location: { lat: 40.7589, lng: -73.9851 }, // Times Square area
        messages: [
            "I love attending yoga classes and meditation workshops",
            "Looking for healthy food spots and wellness activities",
            "Interested in mindfulness and stress relief techniques"
        ]
    },
    {
        id: 'seed-fitness-2',
        name: 'Marcus Johnson',
        email: 'marcus.johnson@example.com',
        interests: ['weightlifting', 'crossfit', 'protein nutrition', 'gym culture'],
        location: { lat: 40.7505, lng: -73.9934 }, // Chelsea area
        messages: [
            "I'm a regular at the gym and love strength training",
            "Looking for CrossFit communities and fitness challenges",
            "Interested in nutrition and meal prep for athletes"
        ]
    },
    {
        id: 'seed-fitness-3',
        name: 'Amanda Foster',
        email: 'amanda.foster@example.com',
        interests: ['pilates', 'barre', 'flexibility', 'posture'],
        location: { lat: 40.7265, lng: -73.9942 }, // SoHo area
        messages: [
            "I'm passionate about pilates and barre classes",
            "Looking for flexibility and posture improvement",
            "Interested in low-impact fitness activities"
        ]
    },
    {
        id: 'seed-fitness-4',
        name: 'Tyler Reynolds',
        email: 'tyler.reynolds@example.com',
        interests: ['running', 'marathons', 'endurance training', 'trail running'],
        location: { lat: 40.7589, lng: -73.9851 }, // Central Park area
        messages: [
            "I'm training for my next marathon",
            "Looking for running groups and trail running spots",
            "Interested in endurance training and race preparation"
        ]
    },
    {
        id: 'seed-fitness-5',
        name: 'Zoe Martinez',
        email: 'zoe.martinez@example.com',
        interests: ['cycling', 'spin classes', 'outdoor biking', 'cardio'],
        location: { lat: 40.7505, lng: -73.9934 }, // West Village area
        messages: [
            "I love cycling and spin classes",
            "Looking for outdoor biking routes and cycling groups",
            "Interested in cardio fitness and endurance sports"
        ]
    },

    // Creative Arts Cluster
    {
        id: 'seed-creative-1',
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@example.com',
        interests: ['painting', 'art galleries', 'creative workshops', 'design'],
        location: { lat: 40.7265, lng: -73.9942 }, // SoHo area
        messages: [
            "I'm an artist and love visiting galleries and museums",
            "Looking for creative workshops and art classes",
            "Interested in design thinking and creative collaboration"
        ]
    },
    {
        id: 'seed-creative-2',
        name: 'David Kim',
        email: 'david.kim@example.com',
        interests: ['photography', 'film', 'documentary', 'visual storytelling'],
        location: { lat: 40.7589, lng: -73.9851 }, // Midtown area
        messages: [
            "I'm a photographer and filmmaker",
            "Looking for film screenings and photography meetups",
            "Interested in documentary storytelling and visual arts"
        ]
    },
    {
        id: 'seed-creative-3',
        name: 'Sophie Anderson',
        email: 'sophie.anderson@example.com',
        interests: ['sculpture', 'ceramics', 'pottery', '3D art'],
        location: { lat: 40.7265, lng: -73.9942 }, // Brooklyn area
        messages: [
            "I work with clay and love creating sculptures",
            "Looking for pottery studios and ceramic workshops",
            "Interested in 3D art forms and sculptural techniques"
        ]
    },
    {
        id: 'seed-creative-4',
        name: 'Lucas Chen',
        email: 'lucas.chen@example.com',
        interests: ['digital art', 'illustration', 'graphic design', 'animation'],
        location: { lat: 40.7505, lng: -73.9934 }, // Chelsea area
        messages: [
            "I'm a digital artist and illustrator",
            "Looking for digital art workshops and design meetups",
            "Interested in animation and graphic design techniques"
        ]
    },
    {
        id: 'seed-creative-5',
        name: 'Isabella Torres',
        email: 'isabella.torres@example.com',
        interests: ['textile art', 'weaving', 'fiber arts', 'crafts'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper East Side area
        messages: [
            "I love working with textiles and fiber arts",
            "Looking for weaving workshops and craft communities",
            "Interested in traditional and contemporary textile techniques"
        ]
    },

    // Technology & Innovation Cluster
    {
        id: 'seed-tech-1',
        name: 'Alex Thompson',
        email: 'alex.thompson@example.com',
        interests: ['programming', 'AI', 'startups', 'tech meetups'],
        location: { lat: 40.7505, lng: -73.9934 }, // Chelsea area
        messages: [
            "I'm a software engineer working on AI projects",
            "Looking for tech meetups and startup events",
            "Interested in machine learning and emerging technologies"
        ]
    },
    {
        id: 'seed-tech-2',
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        interests: ['data science', 'analytics', 'business intelligence', 'tech networking'],
        location: { lat: 40.7265, lng: -73.9942 }, // Financial District area
        messages: [
            "I work in data science and love analytics",
            "Looking for data science meetups and networking events",
            "Interested in business intelligence and data visualization"
        ]
    },
    {
        id: 'seed-tech-3',
        name: 'Ryan O\'Connor',
        email: 'ryan.oconnor@example.com',
        interests: ['blockchain', 'cryptocurrency', 'web3', 'decentralized finance'],
        location: { lat: 40.7505, lng: -73.9934 }, // Lower Manhattan area
        messages: [
            "I'm passionate about blockchain and cryptocurrency",
            "Looking for web3 meetups and DeFi discussions",
            "Interested in decentralized technologies and crypto trading"
        ]
    },
    {
        id: 'seed-tech-4',
        name: 'Maya Singh',
        email: 'maya.singh@example.com',
        interests: ['cybersecurity', 'ethical hacking', 'penetration testing', 'security'],
        location: { lat: 40.7265, lng: -73.9942 }, // Midtown area
        messages: [
            "I work in cybersecurity and ethical hacking",
            "Looking for security conferences and hacking workshops",
            "Interested in penetration testing and security research"
        ]
    },
    {
        id: 'seed-tech-5',
        name: 'Kevin Zhang',
        email: 'kevin.zhang@example.com',
        interests: ['mobile development', 'iOS', 'Android', 'app development'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper West Side area
        messages: [
            "I'm a mobile app developer",
            "Looking for mobile development meetups and hackathons",
            "Interested in iOS and Android development techniques"
        ]
    },

    // Food & Dining Cluster
    {
        id: 'seed-food-1',
        name: 'Carlos Mendez',
        email: 'carlos.mendez@example.com',
        interests: ['cooking', 'restaurants', 'food culture', 'culinary arts'],
        location: { lat: 40.7265, lng: -73.9942 }, // East Village area
        messages: [
            "I'm a foodie and love trying new restaurants",
            "Looking for cooking classes and food tours",
            "Interested in different cuisines and culinary techniques"
        ]
    },
    {
        id: 'seed-food-2',
        name: 'Lisa Wang',
        email: 'lisa.wang@example.com',
        interests: ['vegan cooking', 'healthy eating', 'sustainable food', 'plant-based'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper West Side area
        messages: [
            "I'm passionate about vegan and plant-based cooking",
            "Looking for vegan restaurants and cooking workshops",
            "Interested in sustainable food practices and healthy eating"
        ]
    },
    {
        id: 'seed-food-3',
        name: 'James Wilson',
        email: 'james.wilson@example.com',
        interests: ['baking', 'pastry', 'desserts', 'bread making'],
        location: { lat: 40.7505, lng: -73.9934 }, // Chelsea area
        messages: [
            "I love baking and creating pastries",
            "Looking for baking classes and pastry workshops",
            "Interested in bread making and dessert techniques"
        ]
    },
    {
        id: 'seed-food-4',
        name: 'Aisha Rahman',
        email: 'aisha.rahman@example.com',
        interests: ['middle eastern cuisine', 'spices', 'traditional cooking', 'halal food'],
        location: { lat: 40.7265, lng: -73.9942 }, // Astoria area
        messages: [
            "I specialize in Middle Eastern cuisine and spices",
            "Looking for traditional cooking workshops and halal restaurants",
            "Interested in authentic ethnic cooking techniques"
        ]
    },
    {
        id: 'seed-food-5',
        name: 'Miguel Santos',
        email: 'miguel.santos@example.com',
        interests: ['bbq', 'grilling', 'smoking meat', 'outdoor cooking'],
        location: { lat: 40.7589, lng: -73.9851 }, // Brooklyn area
        messages: [
            "I'm passionate about BBQ and grilling techniques",
            "Looking for BBQ competitions and grilling workshops",
            "Interested in smoking meat and outdoor cooking methods"
        ]
    },

    // Music & Entertainment Cluster
    {
        id: 'seed-music-1',
        name: 'Jordan Smith',
        email: 'jordan.smith@example.com',
        interests: ['live music', 'jazz', 'concerts', 'music venues'],
        location: { lat: 40.7265, lng: -73.9942 }, // Greenwich Village area
        messages: [
            "I love live music and jazz performances",
            "Looking for intimate music venues and jazz clubs",
            "Interested in discovering new artists and music genres"
        ]
    },
    {
        id: 'seed-music-2',
        name: 'Nina Garcia',
        email: 'nina.garcia@example.com',
        interests: ['dancing', 'salsa', 'latin music', 'dance classes'],
        location: { lat: 40.7505, lng: -73.9934 }, // Washington Heights area
        messages: [
            "I love dancing, especially salsa and latin music",
            "Looking for dance classes and latin music venues",
            "Interested in cultural dance events and music festivals"
        ]
    },
    {
        id: 'seed-music-3',
        name: 'Brandon Lee',
        email: 'brandon.lee@example.com',
        interests: ['hip hop', 'rap', 'beat making', 'music production'],
        location: { lat: 40.7265, lng: -73.9942 }, // Harlem area
        messages: [
            "I'm a hip hop artist and music producer",
            "Looking for beat making workshops and rap battles",
            "Interested in music production and hip hop culture"
        ]
    },
    {
        id: 'seed-music-4',
        name: 'Elena Popov',
        email: 'elena.popov@example.com',
        interests: ['classical music', 'orchestra', 'opera', 'chamber music'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper East Side area
        messages: [
            "I'm a classical musician and love orchestral music",
            "Looking for classical concerts and opera performances",
            "Interested in chamber music and classical compositions"
        ]
    },
    {
        id: 'seed-music-5',
        name: 'Diego Rodriguez',
        email: 'diego.rodriguez@example.com',
        interests: ['rock music', 'guitar', 'band performances', 'music festivals'],
        location: { lat: 40.7505, lng: -73.9934 }, // Lower East Side area
        messages: [
            "I play guitar and love rock music",
            "Looking for band performances and music festivals",
            "Interested in rock culture and guitar techniques"
        ]
    },

    // Education & Learning Cluster
    {
        id: 'seed-education-1',
        name: 'Dr. Rachel Green',
        email: 'rachel.green@example.com',
        interests: ['academic research', 'lectures', 'book clubs', 'intellectual discussions'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper West Side area
        messages: [
            "I'm a professor and love academic discussions",
            "Looking for intellectual lectures and book clubs",
            "Interested in research collaborations and academic events"
        ]
    },
    {
        id: 'seed-education-2',
        name: 'Tommy Park',
        email: 'tommy.park@example.com',
        interests: ['language learning', 'spanish', 'conversation practice', 'cultural exchange'],
        location: { lat: 40.7265, lng: -73.9942 }, // Queens area
        messages: [
            "I'm learning Spanish and want to practice conversation",
            "Looking for language exchange meetups and cultural events",
            "Interested in Spanish-speaking communities and cultural activities"
        ]
    },
    {
        id: 'seed-education-3',
        name: 'Maria Santos',
        email: 'maria.santos@example.com',
        interests: ['workshops', 'skill building', 'professional development', 'networking'],
        location: { lat: 40.7505, lng: -73.9934 }, // Midtown area
        messages: [
            "I love attending workshops and skill-building events",
            "Looking for professional development opportunities",
            "Interested in networking events and career growth"
        ]
    },

    // Outdoor & Adventure Cluster
    {
        id: 'seed-outdoor-1',
        name: 'Jake Williams',
        email: 'jake.williams@example.com',
        interests: ['hiking', 'camping', 'rock climbing', 'outdoor adventures'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper East Side area
        messages: [
            "I'm an outdoor enthusiast and love hiking",
            "Looking for camping trips and rock climbing groups",
            "Interested in outdoor adventures and nature activities"
        ]
    },
    {
        id: 'seed-outdoor-2',
        name: 'Sofia Rodriguez',
        email: 'sofia.rodriguez@example.com',
        interests: ['kayaking', 'water sports', 'beach activities', 'marine life'],
        location: { lat: 40.7265, lng: -73.9942 }, // Brooklyn area
        messages: [
            "I love water sports and kayaking",
            "Looking for beach activities and marine life events",
            "Interested in ocean conservation and water adventures"
        ]
    },
    {
        id: 'seed-outdoor-3',
        name: 'Chris Thompson',
        email: 'chris.thompson@example.com',
        interests: ['skiing', 'snowboarding', 'winter sports', 'mountain activities'],
        location: { lat: 40.7505, lng: -73.9934 }, // Chelsea area
        messages: [
            "I'm passionate about skiing and winter sports",
            "Looking for snowboarding trips and mountain activities",
            "Interested in winter adventure sports and mountain culture"
        ]
    },

    // Gaming & Esports Cluster
    {
        id: 'seed-gaming-1',
        name: 'Alex Chen',
        email: 'alex.chen@example.com',
        interests: ['video games', 'esports', 'gaming tournaments', 'board games'],
        location: { lat: 40.7265, lng: -73.9942 }, // Chinatown area
        messages: [
            "I'm a competitive gamer and love esports",
            "Looking for gaming tournaments and board game nights",
            "Interested in video game culture and competitive gaming"
        ]
    },
    {
        id: 'seed-gaming-2',
        name: 'Lily Johnson',
        email: 'lily.johnson@example.com',
        interests: ['tabletop games', 'dungeons and dragons', 'roleplaying', 'strategy games'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper West Side area
        messages: [
            "I love tabletop games and D&D campaigns",
            "Looking for roleplaying groups and strategy game nights",
            "Interested in fantasy gaming and collaborative storytelling"
        ]
    },

    // Fashion & Style Cluster
    {
        id: 'seed-fashion-1',
        name: 'Isabella Martinez',
        email: 'isabella.martinez@example.com',
        interests: ['fashion design', 'style consulting', 'fashion shows', 'trends'],
        location: { lat: 40.7505, lng: -73.9934 }, // SoHo area
        messages: [
            "I'm a fashion designer and love style consulting",
            "Looking for fashion shows and trend discussions",
            "Interested in fashion industry events and style workshops"
        ]
    },
    {
        id: 'seed-fashion-2',
        name: 'Marcus Davis',
        email: 'marcus.davis@example.com',
        interests: ['streetwear', 'sneaker culture', 'urban fashion', 'style photography'],
        location: { lat: 40.7265, lng: -73.9942 }, // Harlem area
        messages: [
            "I'm into streetwear and sneaker culture",
            "Looking for urban fashion events and style photography",
            "Interested in streetwear trends and sneaker releases"
        ]
    },

    // Business & Entrepreneurship Cluster
    {
        id: 'seed-business-1',
        name: 'Jennifer Lee',
        email: 'jennifer.lee@example.com',
        interests: ['startup networking', 'business strategy', 'entrepreneurship', 'investing'],
        location: { lat: 40.7505, lng: -73.9934 }, // Financial District area
        messages: [
            "I'm an entrepreneur and love startup networking",
            "Looking for business strategy discussions and investment opportunities",
            "Interested in entrepreneurship events and business development"
        ]
    },
    {
        id: 'seed-business-2',
        name: 'Robert Kim',
        email: 'robert.kim@example.com',
        interests: ['consulting', 'business consulting', 'strategy', 'corporate events'],
        location: { lat: 40.7589, lng: -73.9851 }, // Midtown area
        messages: [
            "I work in business consulting and strategy",
            "Looking for corporate events and consulting opportunities",
            "Interested in business strategy and professional networking"
        ]
    },

    // Health & Medical Cluster
    {
        id: 'seed-health-1',
        name: 'Dr. Sarah Wilson',
        email: 'sarah.wilson@example.com',
        interests: ['medical conferences', 'healthcare innovation', 'medical research', 'public health'],
        location: { lat: 40.7505, lng: -73.9934 }, // Upper East Side area
        messages: [
            "I'm a doctor and interested in healthcare innovation",
            "Looking for medical conferences and research collaborations",
            "Interested in public health initiatives and medical technology"
        ]
    },
    {
        id: 'seed-health-2',
        name: 'Michael Brown',
        email: 'michael.brown@example.com',
        interests: ['mental health', 'therapy', 'wellness coaching', 'mindfulness'],
        location: { lat: 40.7265, lng: -73.9942 }, // Brooklyn area
        messages: [
            "I'm a mental health advocate and wellness coach",
            "Looking for therapy workshops and wellness events",
            "Interested in mental health awareness and mindfulness practices"
        ]
    },

    // Science & Research Cluster
    {
        id: 'seed-science-1',
        name: 'Dr. Emily Zhang',
        email: 'emily.zhang@example.com',
        interests: ['scientific research', 'laboratory work', 'science communication', 'academic conferences'],
        location: { lat: 40.7589, lng: -73.9851 }, // Upper West Side area
        messages: [
            "I'm a research scientist and love laboratory work",
            "Looking for scientific conferences and research collaborations",
            "Interested in science communication and academic discussions"
        ]
    },
    {
        id: 'seed-science-2',
        name: 'David Miller',
        email: 'david.miller@example.com',
        interests: ['astronomy', 'space exploration', 'planetariums', 'science museums'],
        location: { lat: 40.7505, lng: -73.9934 }, // Chelsea area
        messages: [
            "I'm passionate about astronomy and space exploration",
            "Looking for planetarium visits and science museum events",
            "Interested in space science and astronomical observations"
        ]
    },

    // Social Justice & Activism Cluster
    {
        id: 'seed-activism-1',
        name: 'Aisha Johnson',
        email: 'aisha.johnson@example.com',
        interests: ['social justice', 'activism', 'community organizing', 'human rights'],
        location: { lat: 40.7265, lng: -73.9942 }, // Harlem area
        messages: [
            "I'm a community organizer and social justice advocate",
            "Looking for activism events and community organizing workshops",
            "Interested in human rights and social justice initiatives"
        ]
    },
    {
        id: 'seed-activism-2',
        name: 'Carlos Rodriguez',
        email: 'carlos.rodriguez@example.com',
        interests: ['environmental activism', 'climate change', 'sustainability', 'green initiatives'],
        location: { lat: 40.7589, lng: -73.9851 }, // Brooklyn area
        messages: [
            "I'm an environmental activist and climate advocate",
            "Looking for sustainability events and green initiatives",
            "Interested in climate change awareness and environmental protection"
        ]
    },

    // Travel & Culture Cluster
    {
        id: 'seed-travel-1',
        name: 'Emma Wilson',
        email: 'emma.wilson@example.com',
        interests: ['international travel', 'cultural exchange', 'language immersion', 'global cultures'],
        location: { lat: 40.7505, lng: -73.9934 }, // Queens area
        messages: [
            "I love international travel and cultural exchange",
            "Looking for language immersion programs and cultural events",
            "Interested in global cultures and international experiences"
        ]
    },
    {
        id: 'seed-travel-2',
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@example.com',
        interests: ['middle eastern culture', 'arabic language', 'cultural heritage', 'international cuisine'],
        location: { lat: 40.7265, lng: -73.9942 }, // Astoria area
        messages: [
            "I'm passionate about Middle Eastern culture and Arabic language",
            "Looking for cultural heritage events and international cuisine",
            "Interested in Arabic language learning and cultural preservation"
        ]
    }
];

/**
 * Generate realistic messages for a mock user
 */
function generateUserMessages(mockUser: MockUser): MockMessage[] {
    const messages: MockMessage[] = [];

    // System welcome message (7 days ago)
    messages.push({
        role: 'system',
        content: `Welcome ${mockUser.name}! I'm here to help you discover amazing events in your area.`,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    });

    // User interest messages (spread over the last week)
    mockUser.messages.forEach((msg, index) => {
        messages.push({
            role: 'user',
            content: msg,
            createdAt: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000)
        });
    });

    // Assistant responses (1 day ago)
    messages.push({
        role: 'assistant',
        content: `Based on your interests in ${mockUser.interests.join(', ')}, I can help you find events that match your preferences.`,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    return messages;
}

/**
 * Insert users and their messages into the database
 */
async function insertUsersWithMessages() {
    const usersToSeed = getUsersToSeed(requestedUserCount);
    const userCount = requestedUserCount === -1 ? 'all' : requestedUserCount;

    console.log('🚀 Starting user seeding process...');
    console.log(`📊 Creating ${usersToSeed.length} mock users with messages (requested: ${userCount})`);

    try {
        // Step 1: Insert users
        console.log('\n👥 Step 1: Inserting users...');
        const userInsertData = usersToSeed.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            emailVerified: true,
            interestEmbedding: null, // Will be generated by message processing
            recommendedEventIds: [],
            location: u.location,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        await db.insert(user).values(userInsertData);
        console.log(`✅ Successfully inserted ${usersToSeed.length} users`);

        // Step 2: Insert messages for each user
        console.log('\n💬 Step 2: Inserting messages...');
        let totalMessages = 0;

        for (const mockUser of usersToSeed) {
            const messages = generateUserMessages(mockUser);
            const messageInsertData = messages.map(m => ({
                userId: mockUser.id,
                role: m.role,
                content: m.content,
                isSummarized: false,
                createdAt: m.createdAt
            }));

            await db.insert(message).values(messageInsertData);
            totalMessages += messages.length;
            console.log(`   ✅ User ${mockUser.name}: ${messages.length} messages`);
        }

        console.log(`✅ Successfully inserted ${totalMessages} total messages`);

        // Step 3: Generate embeddings for each user
        console.log('\n🔍 Step 3: Generating user interest embeddings...');
        let embeddingsGenerated = 0;

        for (const mockUser of usersToSeed) {
            const messages = await db.select().from(message).where(eq(message.userId, mockUser.id));

            // Create conversation context from user's messages
            const conversationContext = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            // Generate weighted interests and embedding
            await updateUserInterestEmbedding(mockUser.id, conversationContext);
            embeddingsGenerated++;
            console.log(`   ✅ User ${mockUser.name}: Interest embedding generated`);
        }

        console.log(`✅ Successfully generated ${embeddingsGenerated} interest embeddings`);

        return { usersCreated: usersToSeed.length, messagesCreated: totalMessages, embeddingsGenerated };

    } catch (error: any) {
        console.error('❌ Error inserting users and messages:', error);
        throw error;
    }
}

/**
 * Validate that users and messages were created successfully
 */
async function validateUserCreation() {
    console.log('\n🔍 Step 3: Validating data creation...');

    const usersToSeed = getUsersToSeed(requestedUserCount);

    try {
        // Check users
        const createdUsers = await db.select().from(user);
        console.log(`   ✅ Users in database: ${createdUsers.length}`);

        // Check messages
        const createdMessages = await db.select().from(message);
        console.log(`   ✅ Messages in database: ${createdMessages.length}`);

        // Check specific users
        for (const mockUser of usersToSeed) {
            const dbUser = await db.select().from(user).where(eq(user.id, mockUser.id)).limit(1);
            if (dbUser.length === 0) {
                throw new Error(`User ${mockUser.name} was not created`);
            }

            const userMessages = await db.select().from(message).where(eq(message.userId, mockUser.id));
            if (userMessages.length === 0) {
                throw new Error(`No messages found for user ${mockUser.name}`);
            }

            // Check for weighted interests and embeddings
            const dbUserRecord = dbUser[0];
            if (!dbUserRecord.weightedInterests) {
                throw new Error(`No weighted interests found for user ${mockUser.name}`);
            }
            if (!dbUserRecord.interestEmbedding) {
                throw new Error(`No interest embedding found for user ${mockUser.name}`);
            }

            console.log(`   ✅ ${mockUser.name}: ${userMessages.length} messages, weighted interests: ${dbUserRecord.weightedInterests.substring(0, 50)}...`);
        }

        console.log('✅ All validation checks passed!');
        return true;

    } catch (error: any) {
        console.error('❌ Validation failed:', error.message);
        throw error;
    }
}

/**
 * Display summary of created data
 */
function displaySummary() {
    console.log('\n📊 SEEDING SUMMARY:');
    console.log('='.repeat(50));

    const usersToSeed = getUsersToSeed(requestedUserCount);

    // Group users by interest clusters
    const clusters = {
        'Fitness & Wellness': usersToSeed.filter(u => u.interests.some(i => ['yoga', 'meditation', 'weightlifting', 'crossfit', 'pilates', 'running', 'cycling', 'mental health', 'therapy', 'wellness coaching'].includes(i))),
        'Creative Arts': usersToSeed.filter(u => u.interests.some(i => ['painting', 'photography', 'art galleries', 'design', 'sculpture', 'digital art', 'textile art', 'fashion design', 'style consulting'].includes(i))),
        'Technology': usersToSeed.filter(u => u.interests.some(i => ['programming', 'AI', 'data science', 'tech meetups', 'blockchain', 'cybersecurity', 'mobile development', 'video games', 'esports'].includes(i))),
        'Food & Dining': usersToSeed.filter(u => u.interests.some(i => ['cooking', 'restaurants', 'vegan cooking', 'food culture', 'baking', 'middle eastern cuisine', 'bbq', 'arabic language', 'international cuisine'].includes(i))),
        'Music & Entertainment': usersToSeed.filter(u => u.interests.some(i => ['live music', 'dancing', 'jazz', 'concerts', 'hip hop', 'classical music', 'rock music', 'tabletop games', 'roleplaying'].includes(i))),
        'Education & Learning': usersToSeed.filter(u => u.interests.some(i => ['academic research', 'lectures', 'book clubs', 'language learning', 'workshops', 'skill building', 'professional development'].includes(i))),
        'Outdoor & Adventure': usersToSeed.filter(u => u.interests.some(i => ['hiking', 'camping', 'rock climbing', 'kayaking', 'water sports', 'skiing', 'snowboarding', 'outdoor adventures'].includes(i))),
        'Business & Entrepreneurship': usersToSeed.filter(u => u.interests.some(i => ['startup networking', 'business strategy', 'entrepreneurship', 'consulting', 'corporate events', 'investing'].includes(i))),
        'Science & Research': usersToSeed.filter(u => u.interests.some(i => ['scientific research', 'laboratory work', 'astronomy', 'space exploration', 'medical research', 'healthcare innovation'].includes(i))),
        'Social Justice & Activism': usersToSeed.filter(u => u.interests.some(i => ['social justice', 'activism', 'environmental activism', 'climate change', 'sustainability', 'community organizing'].includes(i))),
        'Travel & Culture': usersToSeed.filter(u => u.interests.some(i => ['international travel', 'cultural exchange', 'middle eastern culture', 'cultural heritage', 'global cultures', 'language immersion'].includes(i)))
    };

    Object.entries(clusters).forEach(([clusterName, users]) => {
        if (users.length > 0) {
            console.log(`   ${clusterName}: ${users.length} users`);
            users.forEach(user => {
                console.log(`     • ${user.name} (${user.interests.join(', ')})`);
            });
        }
    });

    console.log('\n📍 Geographic Distribution:');
    const locations = usersToSeed.map(u => `${u.name}: ${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)}`);
    locations.forEach(loc => console.log(`   • ${loc}`));

    console.log('\n🔍 Embedding Generation:');
    console.log('   • All users now have weighted interest profiles');
    console.log('   • Interest embeddings generated from conversation context');
    console.log('   • Ready for enhanced event recommendation matching');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Run: npm run test:full-pipeline');
    console.log('   2. Check user clustering results');
    console.log('   3. Verify enhanced venue data capture');
    console.log('   4. Test event recommendations with weighted interests');
}

/**
 * Main seeding function
 */
async function seedUsers() {
    console.log('🌱 SEED USERS SCRIPT');
    console.log('='.repeat(50));

    try {
        // Step 0: Clean up existing seeded users
        console.log('\n🧹 Step 0: Cleaning up existing seeded users...');
        const cleanedUp = await cleanupExistingSeededUsers();
        if (cleanedUp > 0) {
            console.log(`   ✅ Cleaned up ${cleanedUp} existing seeded users`);
        }

        // Step 1: Insert users and messages
        const result = await insertUsersWithMessages();

        // Step 2: Validate creation
        await validateUserCreation();

        // Step 3: Display summary
        displaySummary();

        console.log('\n🎉 User seeding completed successfully!');
        console.log(`📈 Created ${result.usersCreated} users with ${result.messagesCreated} messages`);
        console.log(`🔍 Generated ${result.embeddingsGenerated} interest embeddings`);
        console.log('\n💡 Users are now ready for clustering and event generation!');

        return { success: true, ...result };

    } catch (error: any) {
        console.error('\n❌ User seeding failed:', error.message);
        console.error('Stack trace:', error.stack);
        return { success: false, error: error.message };
    }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
    seedUsers()
        .then(result => {
            if (result.success) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

export { mockUsers, seedUsers };
