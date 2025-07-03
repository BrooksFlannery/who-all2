import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { event } from '../lib/db/schema';
import { EventCategory } from '../lib/db/types';
import { generateAllEventEmbeddings } from '../lib/embeddings';
import { validateEnv } from '../lib/validation';

// Validate environment variables
const env = validateEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

// Create database connection using the same pattern as lib/db/index.ts
const sql = neon(databaseUrl);
const db = drizzle(sql);

// Helper function to create future dates
const createFutureDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
};

// Hardcoded meetup events with category overlap
const meetupEvents = [
    // Fitness + Social overlap
    {
        title: "Morning Running Club",
        description: "Join our weekly running group! All paces welcome. We meet at Golden Gate Park and run 3-5 miles together.",
        categories: ['fitness', 'social'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        date: createFutureDate(2),
    },
    {
        title: "Yoga & Coffee Meetup",
        description: "Start your day with gentle yoga followed by coffee and conversation with fellow wellness enthusiasts.",
        categories: ['fitness', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        date: createFutureDate(3),
    },
    {
        title: "Hiking & Photography Group",
        description: "Explore beautiful trails while learning photography tips. Great for nature lovers and creative minds.",
        categories: ['fitness', 'outdoors', 'creative'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        date: createFutureDate(5),
    },

    // Technology + Social overlap
    {
        title: "Tech Coffee & Networking",
        description: "Weekly meetup for tech professionals to network over coffee. Share ideas, find collaborators, make connections.",
        categories: ['technology', 'social', 'business'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        date: createFutureDate(1),
    },
    {
        title: "Coding & Pizza Night",
        description: "Work on coding projects together while enjoying pizza. Perfect for developers looking to collaborate.",
        categories: ['technology', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        date: createFutureDate(4),
    },
    {
        title: "Startup Founders Meetup",
        description: "Connect with fellow entrepreneurs, share challenges, and explore potential partnerships.",
        categories: ['technology', 'business', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        date: createFutureDate(6),
    },

    // Creative + Social overlap
    {
        title: "Art & Wine Night",
        description: "Create art together while enjoying wine and good conversation. All skill levels welcome!",
        categories: ['creative', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        date: createFutureDate(2),
    },
    {
        title: "Photography Walk & Brunch",
        description: "Capture the city's beauty on camera, then share photos over brunch with fellow photographers.",
        categories: ['creative', 'outdoors', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        date: createFutureDate(7),
    },
    {
        title: "Craft Beer & Music Jam",
        description: "Bring your instruments and join our casual music session while sampling local craft beers.",
        categories: ['creative', 'music', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        date: createFutureDate(3),
    },

    // Education + Various overlaps
    {
        title: "Language Exchange & Coffee",
        description: "Practice languages with native speakers while enjoying coffee. Multiple languages welcome!",
        categories: ['education', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        date: createFutureDate(4),
    },
    {
        title: "Financial Literacy Workshop",
        description: "Learn about personal finance, investing, and budgeting in a supportive group environment.",
        categories: ['education', 'business'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        date: createFutureDate(8),
    },
    {
        title: "Public Speaking Practice",
        description: "Improve your public speaking skills in a friendly, supportive environment. All levels welcome.",
        categories: ['education', 'social', 'business'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        date: createFutureDate(5),
    },

    // Food + Various overlaps
    {
        title: "Cooking Class & Wine Tasting",
        description: "Learn to cook delicious dishes while sampling fine wines. Great for food and wine enthusiasts.",
        categories: ['food', 'education', 'social'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        date: createFutureDate(6),
    },
    {
        title: "Farmers Market Tour & Brunch",
        description: "Explore local farmers markets together, then enjoy a community brunch with fresh ingredients.",
        categories: ['food', 'outdoors', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        date: createFutureDate(9),
    },
    {
        title: "International Potluck",
        description: "Share dishes from your culture and learn about different cuisines in a friendly potluck setting.",
        categories: ['food', 'social', 'education'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        date: createFutureDate(7),
    },

    // Music + Various overlaps
    {
        title: "Open Mic & Networking",
        description: "Showcase your musical talents or just enjoy live music while networking with fellow musicians.",
        categories: ['music', 'social', 'creative'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        date: createFutureDate(2),
    },
    {
        title: "Music Production Workshop",
        description: "Learn music production techniques and collaborate on projects with other producers.",
        categories: ['music', 'technology', 'creative'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        date: createFutureDate(8),
    },
    {
        title: "Concert Meetup Group",
        description: "Attend concerts together and discuss music. Great way to discover new artists and make friends.",
        categories: ['music', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        date: createFutureDate(10),
    },

    // Outdoors + Various overlaps
    {
        title: "Beach Cleanup & Picnic",
        description: "Help clean up our beaches while enjoying a community picnic. Environmental awareness meets social fun.",
        categories: ['outdoors', 'social', 'other'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        date: createFutureDate(11),
    },
    {
        title: "Bike Ride & Coffee Stop",
        description: "Scenic bike ride through the city with coffee breaks. Perfect for cyclists and coffee lovers.",
        categories: ['outdoors', 'fitness', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        date: createFutureDate(3),
    },
    {
        title: "Nature Photography Hike",
        description: "Capture stunning nature photos while hiking beautiful trails. Learn photography and enjoy the outdoors.",
        categories: ['outdoors', 'creative', 'fitness'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        date: createFutureDate(12),
    },

    // Business + Various overlaps
    {
        title: "Entrepreneur Coffee Chat",
        description: "Weekly coffee meetup for entrepreneurs to share ideas, challenges, and opportunities.",
        categories: ['business', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        date: createFutureDate(1),
    },
    {
        title: "Career Development Workshop",
        description: "Learn career advancement strategies and network with professionals in your field.",
        categories: ['business', 'education', 'social'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        date: createFutureDate(13),
    },
    {
        title: "Startup Pitch Practice",
        description: "Practice your startup pitch and get feedback from fellow entrepreneurs and investors.",
        categories: ['business', 'technology', 'education'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        date: createFutureDate(14),
    },

    // Additional events for variety
    {
        title: "Board Games & Pizza Night",
        description: "Play board games while enjoying pizza with friends. Casual, fun atmosphere for all ages.",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        date: createFutureDate(4),
    },
    {
        title: "Karaoke & Drinks",
        description: "Sing your heart out at our karaoke night! Great for music lovers and those who love to have fun.",
        categories: ['music', 'social'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        date: createFutureDate(5),
    },
    {
        title: "Trivia Night & Beer",
        description: "Test your knowledge with trivia questions while enjoying craft beer. Weekly competition with prizes.",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        date: createFutureDate(6),
    },
    {
        title: "Speed Dating & Coffee",
        description: "Meet new people in a structured speed dating format. Coffee and conversation in a relaxed setting.",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        date: createFutureDate(7),
    },
    {
        title: "Book Club & Wine",
        description: "Discuss books over wine with fellow literature enthusiasts. Monthly meetings with great conversation.",
        categories: ['social', 'food', 'education'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        date: createFutureDate(8),
    },
    {
        title: "Dance Night & Cocktails",
        description: "Dance the night away with cocktails and great music. Perfect for nightlife enthusiasts.",
        categories: ['music', 'social'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        date: createFutureDate(9),
    },
    {
        title: "Outdoor Movie Night",
        description: "Watch movies under the stars with snacks and good company. Bring blankets and enjoy the show.",
        categories: ['social', 'creative'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        date: createFutureDate(10),
    },
    {
        title: "Language Practice & Tea",
        description: "Practice languages in a traditional tea ceremony setting. Learn from native speakers.",
        categories: ['education', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        date: createFutureDate(11),
    },
    {
        title: "Rock Climbing & Beer",
        description: "Indoor rock climbing followed by beer and stories. Great for fitness enthusiasts and adventure seekers.",
        categories: ['fitness', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        date: createFutureDate(12),
    },
    {
        title: "Art Workshop & Wine",
        description: "Guided art workshop with wine and conversation. Perfect for creative minds and wine lovers.",
        categories: ['creative', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        date: createFutureDate(13),
    },
    {
        title: "Business Lunch & Networking",
        description: "Professional networking lunch for entrepreneurs and business professionals.",
        categories: ['business', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        date: createFutureDate(14),
    },
    {
        title: "Music Theory Class & Coffee",
        description: "Learn music theory basics over coffee. Great for music enthusiasts and beginners.",
        categories: ['education', 'music', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        date: createFutureDate(15),
    },
    {
        title: "Hiking & Photography Tips",
        description: "Scenic hiking with photography tips and guidance. Learn from experienced photographers.",
        categories: ['outdoors', 'creative', 'fitness'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        date: createFutureDate(16),
    },
    {
        title: "Cooking Class & Wine Pairing",
        description: "Expert cooking class with wine pairing guidance. Gourmet experience for food and wine lovers.",
        categories: ['food', 'education', 'social'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        date: createFutureDate(17),
    },
    {
        title: "Tech Startup Meetup",
        description: "Share startup experiences and advice with fellow tech entrepreneurs.",
        categories: ['technology', 'business', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        date: createFutureDate(18),
    },
    {
        title: "Fitness Challenge & Smoothies",
        description: "Group fitness challenge followed by healthy smoothies. Celebrate achievements together.",
        categories: ['fitness', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        date: createFutureDate(19),
    },
    {
        title: "Creative Writing Workshop & Tea",
        description: "Supportive creative writing workshop with tea. Share stories and get feedback.",
        categories: ['creative', 'education', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        date: createFutureDate(20),
    },
    {
        title: "Community Garden & Potluck",
        description: "Work in the community garden and share lunch. Connect with nature and neighbors.",
        categories: ['outdoors', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        date: createFutureDate(21),
    },
    {
        title: "Jazz Night & Cocktails",
        description: "Sophisticated jazz music with cocktails. Perfect for music lovers and cocktail enthusiasts.",
        categories: ['music', 'social'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        date: createFutureDate(22),
    },
];

// Main seeding function
async function seedEvents() {
    try {
        console.log('Starting event seeding...');

        // Delete all existing events
        console.log('Clearing existing events...');
        await db.delete(event);

        // Insert new events
        console.log('Inserting new events...');
        await db.insert(event).values(meetupEvents);

        console.log('✅ Successfully seeded events!');

        // Generate embeddings for all events
        console.log('Generating embeddings for events...');
        await generateAllEventEmbeddings();

        console.log('✅ Successfully generated all event embeddings!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding events:', error);
        process.exit(1);
    }
}

// Run the seeding
seedEvents(); 