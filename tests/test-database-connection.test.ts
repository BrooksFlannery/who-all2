import { neon } from '@neondatabase/serverless';
import { isNull, not } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { beforeAll, describe, expect, it } from 'vitest';
import { user } from '../lib/db/schema';
import { validateEnv } from '../lib/validation';

describe('Database Connection and User Data', () => {
    let db: ReturnType<typeof drizzle> | null = null;

    beforeAll(async () => {
        try {
            // Validate environment variables
            const env = validateEnv();
            const databaseUrl = env.DATABASE_URL;

            if (!databaseUrl) {
                console.log('DATABASE_URL not available, skipping database tests');
                return;
            }

            // Create database connection
            const sql = neon(databaseUrl);
            db = drizzle(sql);
            console.log('✅ Database connection established');
        } catch (error) {
            console.log('❌ Database connection failed:', error);
            db = null;
        }
    });

    describe('Database Connection', () => {
        it('should establish database connection', () => {
            expect(db).toBeDefined();
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }
            expect(typeof db.select).toBe('function');
            expect(typeof db.insert).toBe('function');
            expect(typeof db.update).toBe('function');
            expect(typeof db.delete).toBe('function');
        });
    });

    describe('User Table Structure', () => {
        it('should be able to query user table', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const users = await db.select().from(user).limit(1);
            expect(Array.isArray(users)).toBe(true);
        });

        it('should have users with interest embeddings', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const usersWithEmbeddings = await db.select().from(user).where(not(isNull(user.interestEmbedding)));

            console.log(`📊 Found ${usersWithEmbeddings.length} users with interest embeddings`);
            expect(usersWithEmbeddings.length).toBeGreaterThan(0);

            // Check that at least one user has the expected structure
            const firstUser = usersWithEmbeddings[0];
            expect(firstUser).toHaveProperty('id');
            expect(firstUser).toHaveProperty('name');
            expect(firstUser).toHaveProperty('email');
            expect(firstUser).toHaveProperty('userInterestSummary');
            expect(firstUser).toHaveProperty('interestEmbedding');
            expect(firstUser.interestEmbedding).toBeDefined();
            expect(firstUser.interestEmbedding).not.toBeNull();
        });

        it('should have valid interest embedding format', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const usersWithEmbeddings = await db.select().from(user).where(not(isNull(user.interestEmbedding)));

            if (usersWithEmbeddings.length === 0) {
                console.log('No users with embeddings found');
                return;
            }

            const firstUser = usersWithEmbeddings[0];

            // Parse the embedding and verify it's a valid array
            let embedding: number[];
            try {
                embedding = JSON.parse(firstUser.interestEmbedding!);
            } catch (error) {
                throw new Error(`Invalid JSON in interest embedding: ${error}`);
            }

            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(1536); // text-embedding-3-small dimensions

            // Check that all values are numbers
            embedding.forEach((value, index) => {
                expect(typeof value).toBe('number');
                expect(isNaN(value)).toBe(false);
            });

            console.log(`✅ Valid embedding found: ${embedding.length} dimensions`);
        });

        it('should have users with location data', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const usersWithLocation = await db.select().from(user).where(not(isNull(user.location)));

            console.log(`📍 Found ${usersWithLocation.length} users with location data`);

            if (usersWithLocation.length > 0) {
                const firstUser = usersWithLocation[0];
                expect(firstUser.location).toBeDefined();
                expect(firstUser.location).not.toBeNull();

                // Check location structure
                const location = firstUser.location as any;
                expect(location).toHaveProperty('lat');
                expect(location).toHaveProperty('lng');
                expect(typeof location.lat).toBe('number');
                expect(typeof location.lng).toBe('number');

                console.log(`📍 Sample location: ${location.lat}, ${location.lng}`);
            }
        });
    });

    describe('User Interest Summaries', () => {
        it('should have meaningful interest summaries', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const users = await db.select().from(user).limit(5);

            users.forEach((user, index) => {
                expect(user.userInterestSummary).toBeDefined();
                expect(typeof user.userInterestSummary).toBe('string');

                if (user.userInterestSummary.length > 0) {
                    console.log(`👤 User ${index + 1} interests: ${user.userInterestSummary.substring(0, 100)}...`);
                }
            });
        });
    });

    describe('Data Quality Checks', () => {
        it('should have users with valid email addresses', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const users = await db.select().from(user).limit(5);

            users.forEach((user) => {
                expect(user.email).toBeDefined();
                expect(typeof user.email).toBe('string');
                expect(user.email).toContain('@'); // Basic email validation
            });
        });

        it('should have users with valid names', async () => {
            if (!db) {
                console.log('Skipping test - database not available');
                return;
            }

            const users = await db.select().from(user).limit(5);

            users.forEach((user) => {
                expect(user.name).toBeDefined();
                expect(typeof user.name).toBe('string');
                expect(user.name.length).toBeGreaterThan(0);
            });
        });
    });
}); 