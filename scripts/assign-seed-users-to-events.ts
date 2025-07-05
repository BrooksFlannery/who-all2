import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { updateEventParticipation } from '../lib/db/event-participation';
import { event, eventParticipation, user } from '../lib/db/schema';
import { validateEnv } from '../lib/validation';

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

// CLI argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    const participationRateArg = args.find(arg => arg.startsWith('--rate=') || arg.startsWith('-r='));
    const maxEventsPerUserArg = args.find(arg => arg.startsWith('--max-events=') || arg.startsWith('-m='));

    let participationRate = 0.8; // Default: 80% of seed users will participate in events
    let maxEventsPerUser = 5; // Default: each user participates in up to 5 events

    if (participationRateArg) {
        const rate = parseFloat(participationRateArg.split('=')[1]);
        if (isNaN(rate) || rate < 0 || rate > 1) {
            console.error('❌ Invalid participation rate. Must be between 0 and 1.');
            console.error('Usage: npm run assign:seed-users -- --rate=0.8');
            process.exit(1);
        }
        participationRate = rate;
    }

    if (maxEventsPerUserArg) {
        const max = parseInt(maxEventsPerUserArg.split('=')[1]);
        if (isNaN(max) || max < 1) {
            console.error('❌ Invalid max events per user. Must be a positive number.');
            console.error('Usage: npm run assign:seed-users -- --max-events=5');
            process.exit(1);
        }
        maxEventsPerUser = max;
    }

    return { participationRate, maxEventsPerUser };
}

// Parse CLI arguments
const { participationRate, maxEventsPerUser } = parseArguments();

/**
 * Get all seed users from the database
 */
async function getSeedUsers(): Promise<{ id: string; name: string; email: string }[]> {
    const users = await db.select({
        id: user.id,
        name: user.name,
        email: user.email
    })
        .from(user)
        .where(like(user.id, 'seed-%'));

    return users;
}

/**
 * Get all events from the database
 */
async function getEvents(): Promise<{ id: string; title: string }[]> {
    const events = await db.select({
        id: event.id,
        title: event.title
    })
        .from(event);

    return events;
}

/**
 * Check if user is already participating in an event
 */
async function isUserParticipatingInEvent(userId: string, eventId: string): Promise<boolean> {
    const participation = await db.select()
        .from(eventParticipation)
        .where(
            eq(eventParticipation.userId, userId) &&
            eq(eventParticipation.eventId, eventId)
        );

    return participation.length > 0;
}

/**
 * Get user's current event participations
 */
async function getUserParticipations(userId: string): Promise<{ eventId: string; status: string }[]> {
    const participations = await db.select({
        eventId: eventParticipation.eventId,
        status: eventParticipation.status
    })
        .from(eventParticipation)
        .where(eq(eventParticipation.userId, userId));

    return participations;
}

/**
 * Randomly assign seed users to events
 */
async function assignSeedUsersToEvents(options?: {
    participationRate?: number;
    maxEventsPerUser?: number;
}): Promise<{
    success: boolean;
    usersAssigned: number;
    totalAssignments: number;
    attendingAssignments: number;
    interestedAssignments: number;
}> {
    // Use provided options or fall back to CLI arguments
    const rate = options?.participationRate ?? participationRate;
    const maxEvents = options?.maxEventsPerUser ?? maxEventsPerUser;

    console.log('🎯 ASSIGNING SEED USERS TO EVENTS');
    console.log('='.repeat(50));
    console.log(`📊 Participation rate: ${(rate * 100).toFixed(1)}%`);
    console.log(`📊 Max events per user: ${maxEvents}`);
    console.log(`📊 Distribution: 66% interested, 33% attending`);

    try {
        // Step 1: Get seed users and events
        console.log('\n🔍 Step 1: Fetching seed users and events...');
        const [seedUsers, events] = await Promise.all([
            getSeedUsers(),
            getEvents()
        ]);

        if (seedUsers.length === 0) {
            console.log('❌ No seed users found. Please run the seed users script first.');
            return { success: false, usersAssigned: 0, totalAssignments: 0, attendingAssignments: 0, interestedAssignments: 0 };
        }

        if (events.length === 0) {
            console.log('❌ No events found. Please run the event generation script first.');
            return { success: false, usersAssigned: 0, totalAssignments: 0, attendingAssignments: 0, interestedAssignments: 0 };
        }

        console.log(`👥 Found ${seedUsers.length} seed users`);
        console.log(`🎉 Found ${events.length} events`);

        // Step 2: Determine which users will participate
        const usersToAssign = seedUsers.filter(() => Math.random() < rate);
        console.log(`\n📊 Step 2: ${usersToAssign.length} users will participate in events`);

        // Step 3: Assign users to events
        console.log('\n🎯 Step 3: Assigning users to events...');
        let usersAssigned = 0;
        let totalAssignments = 0;
        let attendingAssignments = 0;
        let interestedAssignments = 0;

        for (const user of usersToAssign) {
            // Determine how many events this user will participate in (1 to maxEvents)
            const eventsToJoin = Math.floor(Math.random() * maxEvents) + 1;

            // Get user's current participations
            const currentParticipations = await getUserParticipations(user.id);
            const availableEvents = events.filter(event =>
                !currentParticipations.some(p => p.eventId === event.id)
            );

            // Shuffle available events and take the first N
            const shuffledEvents = availableEvents.sort(() => Math.random() - 0.5);
            const eventsForUser = shuffledEvents.slice(0, Math.min(eventsToJoin, availableEvents.length));

            if (eventsForUser.length === 0) {
                console.log(`   ⚠️ No available events for user ${user.name}`);
                continue;
            }

            let userAssignments = 0;
            for (const event of eventsForUser) {
                // Determine participation status: 66% interested, 33% attending
                const status = Math.random() < 0.66 ? 'interested' : 'attending';

                try {
                    // Check if user is already participating
                    const isParticipating = await isUserParticipatingInEvent(user.id, event.id);
                    if (isParticipating) {
                        console.log(`   ⚠️ User ${user.name} already participating in ${event.title}`);
                        continue;
                    }

                    // Assign user to event
                    await updateEventParticipation(event.id, user.id, status);

                    userAssignments++;
                    totalAssignments++;

                    if (status === 'attending') {
                        attendingAssignments++;
                    } else {
                        interestedAssignments++;
                    }

                    console.log(`   ✅ ${user.name} → ${event.title} (${status})`);
                } catch (error) {
                    console.error(`   ❌ Failed to assign ${user.name} to ${event.title}:`, error);
                }
            }

            if (userAssignments > 0) {
                usersAssigned++;
            }
        }

        // Step 4: Display summary
        console.log('\n📊 ASSIGNMENT SUMMARY:');
        console.log('='.repeat(50));
        console.log(`👥 Users assigned: ${usersAssigned}/${usersToAssign.length}`);
        console.log(`🎯 Total assignments: ${totalAssignments}`);
        console.log(`✅ Attending assignments: ${attendingAssignments} (${((attendingAssignments / totalAssignments) * 100).toFixed(1)}%)`);
        console.log(`🤔 Interested assignments: ${interestedAssignments} (${((interestedAssignments / totalAssignments) * 100).toFixed(1)}%)`);

        // Step 5: Update event counts
        console.log('\n🔄 Step 4: Updating event participation counts...');
        const allEvents = await db.select().from(event);
        for (const eventRecord of allEvents) {
            const counts = await db.select()
                .from(eventParticipation)
                .where(eq(eventParticipation.eventId, eventRecord.id));

            const attendingCount = counts.filter(c => c.status === 'attending').length;
            const interestedCount = counts.filter(c => c.status === 'interested').length;

            await db.update(event)
                .set({
                    attendeesCount: attendingCount,
                    interestedCount: interestedCount,
                    updatedAt: new Date()
                })
                .where(eq(event.id, eventRecord.id));
        }

        console.log('\n🎉 Seed user assignment completed successfully!');
        console.log(`📈 Created realistic event participation patterns`);

        return {
            success: true,
            usersAssigned,
            totalAssignments,
            attendingAssignments,
            interestedAssignments
        };

    } catch (error: any) {
        console.error('\n❌ Seed user assignment failed:', error.message);
        console.error('Stack trace:', error.stack);
        return { success: false, usersAssigned: 0, totalAssignments: 0, attendingAssignments: 0, interestedAssignments: 0 };
    }
}

// Run the assignment if this script is executed directly
if (require.main === module) {
    assignSeedUsersToEvents()
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

export { assignSeedUsersToEvents };
