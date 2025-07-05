import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { message, user } from '../lib/db/schema';
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

/**
 * Update seed user IDs from "user-" prefix to "seed-" prefix
 */
async function updateSeedUserIds(): Promise<{ success: boolean; usersUpdated: number; messagesUpdated: number }> {
    console.log('🔄 UPDATING SEED USER IDS');
    console.log('='.repeat(50));

    try {
        // Step 1: Find all users with "user-" prefix
        console.log('\n🔍 Step 1: Finding users with "user-" prefix...');
        const usersToUpdate = await db.select()
            .from(user)
            .where(like(user.id, 'user-%'));

        if (usersToUpdate.length === 0) {
            console.log('✅ No users with "user-" prefix found. Nothing to update.');
            return { success: true, usersUpdated: 0, messagesUpdated: 0 };
        }

        console.log(`📊 Found ${usersToUpdate.length} users to update`);

        // Step 2: Create mapping of old IDs to new IDs
        const idMapping = new Map<string, string>();
        usersToUpdate.forEach(user => {
            const newId = user.id.replace('user-', 'seed-');
            idMapping.set(user.id, newId);
        });

        // Step 3: Update message user IDs first
        console.log('\n💬 Step 2: Updating message user IDs...');
        let messagesUpdated = 0;
        for (const [oldId, newId] of idMapping) {
            try {
                // Update message user IDs
                const result = await db.update(message)
                    .set({ userId: newId })
                    .where(eq(message.userId, oldId));
                messagesUpdated++;
                console.log(`   ✅ Updated messages for user: ${oldId} → ${newId}`);
            } catch (error) {
                console.error(`   ❌ Failed to update messages for user ${oldId}:`, error);
            }
        }

        // Step 4: Update event participation user IDs
        console.log('\n🎯 Step 3: Updating event participation user IDs...');
        let participationsUpdated = 0;
        for (const [oldId, newId] of idMapping) {
            try {
                // Import eventParticipation table
                const { eventParticipation } = await import('../lib/db/schema');
                const result = await db.update(eventParticipation)
                    .set({ userId: newId })
                    .where(eq(eventParticipation.userId, oldId));
                participationsUpdated++;
                console.log(`   ✅ Updated participations for user: ${oldId} → ${newId}`);
            } catch (error) {
                console.error(`   ❌ Failed to update participations for user ${oldId}:`, error);
            }
        }

        // Step 5: Update event messages user IDs
        console.log('\n💬 Step 4: Updating event message user IDs...');
        let eventMessagesUpdated = 0;
        for (const [oldId, newId] of idMapping) {
            try {
                // Import eventMessage table
                const { eventMessage } = await import('../lib/db/schema');
                const result = await db.update(eventMessage)
                    .set({ userId: newId })
                    .where(eq(eventMessage.userId, oldId));
                eventMessagesUpdated++;
                console.log(`   ✅ Updated event messages for user: ${oldId} → ${newId}`);
            } catch (error) {
                console.error(`   ❌ Failed to update event messages for user ${oldId}:`, error);
            }
        }

        // Step 6: Update user IDs last (after all foreign key references are updated)
        console.log('\n👥 Step 5: Updating user IDs...');
        let usersUpdated = 0;
        for (const [oldId, newId] of idMapping) {
            try {
                // Update user ID
                await db.update(user)
                    .set({ id: newId })
                    .where(eq(user.id, oldId));
                usersUpdated++;
                console.log(`   ✅ Updated user: ${oldId} → ${newId}`);
            } catch (error) {
                console.error(`   ❌ Failed to update user ${oldId}:`, error);
            }
        }

        console.log('\n🎉 Seed user ID update completed successfully!');
        console.log(`📈 Updated ${usersUpdated} users`);
        console.log(`💬 Updated ${messagesUpdated} messages`);
        console.log(`🎯 Updated ${participationsUpdated} event participations`);
        console.log(`💬 Updated ${eventMessagesUpdated} event messages`);

        return {
            success: true,
            usersUpdated,
            messagesUpdated: messagesUpdated + eventMessagesUpdated
        };

    } catch (error: any) {
        console.error('\n❌ Seed user ID update failed:', error.message);
        console.error('Stack trace:', error.stack);
        return { success: false, usersUpdated: 0, messagesUpdated: 0 };
    }
}

// Run the update if this script is executed directly
if (require.main === module) {
    updateSeedUserIds()
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

export { updateSeedUserIds };
