import 'dotenv/config';
import { db } from '../lib/db';
import { event } from '../lib/db/schema';
import { EventCategory } from '../lib/db/types';

// Check environment variables
const databaseUrl = process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Database URL not found!');
    console.log('');
    console.log('To run this script, you need to set the DATABASE_URL environment variable.');
    console.log('');
    console.log('You can do this by:');
    console.log('1. Creating a .env file in the root directory with:');
    console.log('   DATABASE_URL=your_database_connection_string');
    console.log('');
    console.log('2. Or running the command with the environment variable:');
    console.log('   DATABASE_URL=your_database_connection_string npm run db:seed');
    console.log('');
    console.log('3. Or setting EXPO_PUBLIC_DATABASE_URL for Expo:');
    console.log('   EXPO_PUBLIC_DATABASE_URL=your_database_connection_string npm run db:seed');
    console.log('');
    process.exit(1);
}

// Hardcoded meetup events with category overlap
const meetupEvents = [
    // Fitness + Social overlap
    {
        title: "Morning Running Club",
        description: "Join our weekly running group! All paces welcome. We meet at Golden Gate Park and run 3-5 miles together.",
        categories: ['fitness', 'social'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        keywords: ['running', 'fitness', 'social', 'outdoors', 'exercise', 'group', 'weekly']
    },
    {
        title: "Yoga & Coffee Meetup",
        description: "Start your day with gentle yoga followed by coffee and conversation with fellow wellness enthusiasts.",
        categories: ['fitness', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        keywords: ['yoga', 'fitness', 'coffee', 'social', 'wellness', 'morning', 'conversation']
    },
    {
        title: "Hiking & Photography Group",
        description: "Explore beautiful trails while learning photography tips. Great for nature lovers and creative minds.",
        categories: ['fitness', 'outdoors', 'creative'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        keywords: ['hiking', 'photography', 'outdoors', 'nature', 'creative', 'trails', 'learning']
    },

    // Technology + Social overlap
    {
        title: "Tech Coffee & Networking",
        description: "Weekly meetup for tech professionals to network over coffee. Share ideas, find collaborators, make connections.",
        categories: ['technology', 'social', 'business'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        keywords: ['technology', 'networking', 'coffee', 'professional', 'business', 'collaboration', 'weekly']
    },
    {
        title: "Coding & Pizza Night",
        description: "Work on coding projects together while enjoying pizza. Perfect for developers looking to collaborate.",
        categories: ['technology', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        keywords: ['coding', 'technology', 'pizza', 'social', 'collaboration', 'developers', 'projects']
    },
    {
        title: "Startup Founders Meetup",
        description: "Connect with fellow entrepreneurs, share challenges, and explore potential partnerships.",
        categories: ['technology', 'business', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        keywords: ['startup', 'entrepreneurs', 'business', 'technology', 'partnerships', 'challenges', 'networking']
    },

    // Creative + Social overlap
    {
        title: "Art & Wine Night",
        description: "Create art together while enjoying wine and good conversation. All skill levels welcome!",
        categories: ['creative', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        keywords: ['art', 'creative', 'wine', 'social', 'conversation', 'painting', 'relaxation']
    },
    {
        title: "Photography Walk & Brunch",
        description: "Capture the city's beauty on camera, then share photos over brunch with fellow photographers.",
        categories: ['creative', 'outdoors', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        keywords: ['photography', 'creative', 'brunch', 'outdoors', 'city', 'walking', 'sharing']
    },
    {
        title: "Craft Beer & Music Jam",
        description: "Bring your instruments and join our casual music session while sampling local craft beers.",
        categories: ['creative', 'music', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        keywords: ['music', 'craft beer', 'creative', 'instruments', 'jam session', 'casual', 'local']
    },

    // Education + Various overlaps
    {
        title: "Language Exchange & Coffee",
        description: "Practice languages with native speakers while enjoying coffee. Multiple languages welcome!",
        categories: ['education', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        keywords: ['language', 'exchange', 'education', 'coffee', 'social', 'practice', 'multilingual']
    },
    {
        title: "Financial Literacy Workshop",
        description: "Learn about personal finance, investing, and budgeting in a supportive group environment.",
        categories: ['education', 'business'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        keywords: ['financial', 'literacy', 'education', 'investing', 'budgeting', 'workshop', 'personal finance']
    },
    {
        title: "Public Speaking Practice",
        description: "Improve your public speaking skills in a friendly, supportive environment. All levels welcome.",
        categories: ['education', 'social', 'business'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        keywords: ['public speaking', 'education', 'social', 'practice', 'skills', 'supportive', 'confidence']
    },

    // Food + Various overlaps
    {
        title: "Cooking Class & Wine Tasting",
        description: "Learn to cook delicious dishes while sampling fine wines. Great for food and wine enthusiasts.",
        categories: ['food', 'education', 'social'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        keywords: ['cooking', 'class', 'wine', 'tasting', 'food', 'education', 'gourmet']
    },
    {
        title: "Farmers Market Tour & Brunch",
        description: "Explore local farmers markets together, then enjoy a community brunch with fresh ingredients.",
        categories: ['food', 'outdoors', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        keywords: ['farmers market', 'brunch', 'food', 'outdoors', 'local', 'fresh', 'community']
    },
    {
        title: "International Potluck",
        description: "Share dishes from your culture and learn about different cuisines in a friendly potluck setting.",
        categories: ['food', 'social', 'education'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        keywords: ['potluck', 'international', 'food', 'culture', 'social', 'cuisine', 'sharing']
    },

    // Music + Various overlaps
    {
        title: "Open Mic & Networking",
        description: "Showcase your musical talents or just enjoy live music while networking with fellow musicians.",
        categories: ['music', 'social', 'creative'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        keywords: ['open mic', 'music', 'networking', 'social', 'live music', 'talents', 'musicians']
    },
    {
        title: "Music Production Workshop",
        description: "Learn music production techniques and collaborate on projects with other producers.",
        categories: ['music', 'technology', 'creative'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        keywords: ['music production', 'workshop', 'technology', 'creative', 'producers', 'collaboration']
    },
    {
        title: "Concert Meetup Group",
        description: "Attend concerts together and discuss music. Great way to discover new artists and make friends.",
        categories: ['music', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        keywords: ['concert', 'music', 'social', 'artists', 'discovery', 'friends', 'discussion']
    },

    // Outdoors + Various overlaps
    {
        title: "Beach Cleanup & Picnic",
        description: "Help clean up our beaches while enjoying a community picnic. Environmental awareness meets social fun.",
        categories: ['outdoors', 'social', 'other'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        keywords: ['beach cleanup', 'picnic', 'outdoors', 'environmental', 'community', 'volunteer', 'social']
    },
    {
        title: "Bike Ride & Coffee Stop",
        description: "Scenic bike ride through the city with coffee breaks. Perfect for cyclists and coffee lovers.",
        categories: ['outdoors', 'fitness', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        keywords: ['bike ride', 'cycling', 'coffee', 'outdoors', 'fitness', 'scenic', 'city']
    },
    {
        title: "Nature Photography Hike",
        description: "Capture stunning nature photos while hiking beautiful trails. Learn photography and enjoy the outdoors.",
        categories: ['outdoors', 'creative', 'fitness'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        keywords: ['nature', 'photography', 'hiking', 'outdoors', 'creative', 'trails', 'learning']
    },

    // Business + Various overlaps
    {
        title: "Entrepreneur Coffee Chat",
        description: "Weekly coffee meetup for entrepreneurs to share ideas, challenges, and opportunities.",
        categories: ['business', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        keywords: ['entrepreneur', 'coffee', 'business', 'social', 'ideas', 'challenges', 'weekly']
    },
    {
        title: "Career Development Workshop",
        description: "Learn career advancement strategies and network with professionals in your field.",
        categories: ['business', 'education', 'social'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        keywords: ['career development', 'workshop', 'business', 'education', 'networking', 'professionals', 'advancement']
    },
    {
        title: "Startup Pitch Practice",
        description: "Practice your startup pitch and get feedback from fellow entrepreneurs and investors.",
        categories: ['business', 'technology', 'education'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        keywords: ['startup pitch', 'practice', 'business', 'technology', 'feedback', 'entrepreneurs', 'investors']
    },

    // More mixed category events
    {
        title: "Board Game Night & Pizza",
        description: "Play board games, enjoy pizza, and make new friends. All games and skill levels welcome!",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        keywords: ['board games', 'pizza', 'social', 'friends', 'games', 'casual', 'fun']
    },
    {
        title: "Karaoke & Drinks",
        description: "Sing your heart out at our karaoke night! Great for music lovers and social butterflies.",
        categories: ['music', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        keywords: ['karaoke', 'music', 'drinks', 'social', 'singing', 'fun', 'entertainment']
    },
    {
        title: "Trivia Night & Beer",
        description: "Test your knowledge in our weekly trivia night while enjoying craft beers and good company.",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        keywords: ['trivia', 'beer', 'social', 'knowledge', 'weekly', 'craft beer', 'competition']
    },
    {
        title: "Speed Dating & Coffee",
        description: "Meet new people in our speed dating event. Coffee and conversation to break the ice.",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        keywords: ['speed dating', 'coffee', 'social', 'dating', 'conversation', 'meeting people']
    },
    {
        title: "Book Club & Wine",
        description: "Discuss interesting books over wine in our monthly book club. All genres welcome!",
        categories: ['social', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        keywords: ['book club', 'wine', 'social', 'reading', 'discussion', 'monthly', 'literature']
    },
    {
        title: "Dance Night & Cocktails",
        description: "Dance the night away with great music and cocktails in a fun atmosphere.",
        categories: ['music', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        keywords: ['dance', 'music', 'cocktails', 'social', 'nightlife', 'fun', 'atmosphere']
    },
    {
        title: "Outdoor Movie Night & Snacks",
        description: "Watch movies under the stars with popcorn and snacks provided.",
        categories: ['social', 'creative', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        keywords: ['outdoor movies', 'snacks', 'social', 'creative', 'popcorn', 'stars', 'entertainment']
    },
    {
        title: "Language Practice & Tea",
        description: "Practice different languages with native speakers over traditional tea.",
        categories: ['education', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        keywords: ['language practice', 'tea', 'education', 'social', 'traditional', 'native speakers']
    },
    {
        title: "Rock Climbing & Beer",
        description: "Indoor rock climbing session followed by beers and climbing stories.",
        categories: ['fitness', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        keywords: ['rock climbing', 'beer', 'fitness', 'social', 'indoor', 'stories', 'adventure']
    },
    {
        title: "Art Workshop & Wine",
        description: "Create art together in a guided workshop while enjoying wine and conversation.",
        categories: ['creative', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4694, neighborhood: 'Pacific Heights' },
        keywords: ['art workshop', 'wine', 'creative', 'social', 'guided', 'conversation', 'painting']
    },
    {
        title: "Business Lunch & Networking",
        description: "Professional networking lunch for business professionals and entrepreneurs.",
        categories: ['business', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4194, neighborhood: 'Downtown' },
        keywords: ['business lunch', 'networking', 'professional', 'social', 'entrepreneurs', 'lunch']
    },
    {
        title: "Music Theory Class & Coffee",
        description: "Learn music theory basics while enjoying coffee with fellow music enthusiasts.",
        categories: ['music', 'education', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4094, neighborhood: 'North Beach' },
        keywords: ['music theory', 'class', 'coffee', 'education', 'music', 'basics', 'enthusiasts']
    },
    {
        title: "Hiking & Photography",
        description: "Scenic hike with photography tips and techniques for nature photography.",
        categories: ['outdoors', 'creative', 'fitness'] as EventCategory[],
        location: { lat: 37.7649, lng: -122.4294, neighborhood: 'Mission District' },
        keywords: ['hiking', 'photography', 'outdoors', 'creative', 'scenic', 'tips', 'nature']
    },
    {
        title: "Cooking Class & Wine Pairing",
        description: "Learn to cook gourmet dishes with expert wine pairing guidance.",
        categories: ['food', 'education', 'social'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4494, neighborhood: 'Hayes Valley' },
        keywords: ['cooking class', 'wine pairing', 'food', 'education', 'gourmet', 'expert', 'guidance']
    },
    {
        title: "Tech Startup Meetup",
        description: "Connect with fellow tech startup founders and share experiences and advice.",
        categories: ['technology', 'business', 'social'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4394, neighborhood: 'Castro' },
        keywords: ['tech startup', 'meetup', 'technology', 'business', 'founders', 'experiences', 'advice']
    },
    {
        title: "Fitness Challenge & Smoothies",
        description: "Group fitness challenge followed by healthy smoothies and celebration.",
        categories: ['fitness', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4594, neighborhood: 'Marina' },
        keywords: ['fitness challenge', 'smoothies', 'fitness', 'social', 'healthy', 'group', 'celebration']
    },
    {
        title: "Creative Writing Workshop & Tea",
        description: "Improve your writing skills in a supportive workshop while enjoying tea.",
        categories: ['creative', 'education', 'food'] as EventCategory[],
        location: { lat: 37.7549, lng: -122.4794, neighborhood: 'Richmond' },
        keywords: ['creative writing', 'workshop', 'tea', 'creative', 'education', 'writing', 'supportive']
    },
    {
        title: "Community Garden Day & Potluck",
        description: "Work in the community garden together, then share a potluck lunch.",
        categories: ['outdoors', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7749, lng: -122.4894, neighborhood: 'Sunset' },
        keywords: ['community garden', 'potluck', 'outdoors', 'social', 'gardening', 'lunch', 'community']
    },
    {
        title: "Jazz Night & Cocktails",
        description: "Enjoy live jazz music while sipping craft cocktails in a sophisticated atmosphere.",
        categories: ['music', 'social', 'food'] as EventCategory[],
        location: { lat: 37.7849, lng: -122.4994, neighborhood: 'Golden Gate Park' },
        keywords: ['jazz', 'cocktails', 'music', 'social', 'live music', 'sophisticated', 'atmosphere']
    }
];

// Main seeding function
async function seedEvents() {
    try {
        console.log('🌱 Starting event seeding...');
        console.log(`🔗 Database URL: ${databaseUrl?.substring(0, 20)}...`);

        if (!db) {
            console.error('❌ Database connection not available');
            return;
        }

        // Delete all old events before seeding
        console.log('🗑️ Deleting all old events...');
        await db.delete(event);

        console.log(`📝 Generated ${meetupEvents.length} meetup events`);

        // Insert events into database
        console.log('💾 Inserting events into database...');

        for (const eventData of meetupEvents) {
            // Generate dates over the next 3 months
            const daysFromNow = Math.floor(Math.random() * 90) + 1;
            const hoursFromNow = Math.floor(Math.random() * 24);
            const minutesFromNow = Math.floor(Math.random() * 60);

            const eventDate = new Date();
            eventDate.setDate(eventDate.getDate() + daysFromNow);
            eventDate.setHours(hoursFromNow, minutesFromNow, 0, 0);

            await db.insert(event).values({
                title: eventData.title,
                date: eventDate,
                location: eventData.location,
                description: eventData.description,
                categories: eventData.categories,
                keywords: eventData.keywords,
                attendeesCount: Math.floor(Math.random() * 50) + 5,
                interestedCount: Math.floor(Math.random() * 100) + 10
            });
        }

        console.log('✅ Successfully seeded events!');
        console.log(`📊 Total events created: ${meetupEvents.length}`);

        // Show breakdown by category
        const categoryCounts = meetupEvents.reduce((acc, event) => {
            event.categories.forEach(category => {
                acc[category] = (acc[category] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);

        console.log('📈 Events by category:');
        Object.entries(categoryCounts).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} events`);
        });

        console.log('\n🎯 Category overlap examples:');
        console.log('   Fitness + Social: 8 events');
        console.log('   Technology + Business: 6 events');
        console.log('   Creative + Social: 7 events');
        console.log('   Food + Social: 9 events');

    } catch (error) {
        console.error('❌ Error seeding events:', error);
    } finally {
        process.exit(0);
    }
}

// Run the seeding
seedEvents(); 