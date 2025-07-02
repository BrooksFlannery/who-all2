import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userInterest, userProfile } from '../lib/db/schema';

const connectionString = process.env.EXPO_PUBLIC_DATABASE_URL!;
const sql = neon(connectionString);
const db = drizzle(sql);

async function migrateInterests() {
    console.log('Starting interest migration...');

    try {
        // Get all user profiles with existing interests
        const profiles = await db.select().from(userProfile);

        for (const profile of profiles) {
            console.log(`Processing user: ${profile.userId}`);

            // Skip if no existing interests
            if (!profile.interests || profile.interests.length === 0) {
                console.log(`No interests found for user ${profile.userId}`);
                continue;
            }

            // Convert existing interests to new format
            for (const interest of profile.interests) {
                // Determine specificity based on interest type
                // Simple heuristic: single words are broad, phrases are specific
                const specificity = interest.includes(' ') ? 0.8 : 0.5;
                const confidence = 0.7; // Default confidence for existing interests

                // Insert into new user_interests table
                await db.insert(userInterest).values({
                    userId: profile.userId,
                    keyword: interest,
                    confidence: confidence.toString(),
                    specificity: specificity.toString(),
                    lastUpdated: new Date(),
                    createdAt: new Date()
                }).onConflictDoNothing(); // Avoid duplicates

                console.log(`Migrated interest: ${interest} (confidence: ${confidence}, specificity: ${specificity})`);
            }
        }

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateInterests().catch(console.error);
}

export { migrateInterests };
