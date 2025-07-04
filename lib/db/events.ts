import { and, eq, gte, lte } from 'drizzle-orm';
import { updateEventEmbedding } from '../embeddings';
import { Event } from '../event-generation';
import { initializeDatabase } from './index';
import { event } from './schema';
import { EventInsert } from './types';

/**
 * Insert a single event into the database
 * @param eventData - The event data to insert
 * @returns Promise<string> - The ID of the inserted event
 */
export async function insertEvent(eventData: Event): Promise<string> {
    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    try {
        const insertData: EventInsert = {
            title: eventData.title,
            description: eventData.description,
            embeddingDescription: eventData.embeddingDescription || null,
            categories: eventData.categories,
            date: eventData.date,
            location: eventData.location,
            venue: eventData.venue || null,
            venueType: eventData.venueType || null,
            venueRating: eventData.venueRating ? Math.round(eventData.venueRating * 10) : null,
            venuePriceLevel: eventData.venuePriceLevel || null,
            hostId: eventData.hostId || null,
            embedding: eventData.embedding || null,
            attendeesCount: eventData.attendeesCount,
            interestedCount: eventData.interestedCount
        };

        const result = await database.insert(event).values(insertData).returning({ id: event.id });

        if (!result || result.length === 0) {
            throw new Error('Failed to insert event - no ID returned');
        }

        const eventId = result[0].id;
        console.log(`✅ Inserted event: ${eventData.title} (ID: ${eventId})`);

        // Automatically generate embedding if not provided
        if (!eventData.embedding) {
            try {
                console.log(`🧠 Generating embedding for event: ${eventData.title}`);
                await updateEventEmbedding(
                    eventId,
                    eventData.title,
                    eventData.description,
                    eventData.categories
                );
                console.log(`✅ Generated embedding for event: ${eventData.title}`);
            } catch (embeddingError) {
                console.warn(`⚠️ Failed to generate embedding for event ${eventData.title}:`, embeddingError);
                // Don't fail the event insertion if embedding generation fails
            }
        }

        return eventId;
    } catch (error) {
        console.error(`❌ Error inserting event "${eventData.title}":`, error);
        throw error;
    }
}

/**
 * Insert multiple events into the database in a batch
 * @param events - Array of events to insert
 * @returns Promise<string[]> - Array of inserted event IDs
 */
export async function insertEvents(events: Event[]): Promise<string[]> {
    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    if (events.length === 0) {
        console.log('⚠️ No events to insert');
        return [];
    }

    try {
        const insertData: EventInsert[] = events.map(eventData => ({
            title: eventData.title,
            description: eventData.description,
            embeddingDescription: eventData.embeddingDescription || null,
            categories: eventData.categories,
            date: eventData.date,
            location: eventData.location,
            venue: eventData.venue || null,
            venueType: eventData.venueType || null,
            venueRating: eventData.venueRating ? Math.round(eventData.venueRating * 10) : null,
            venuePriceLevel: eventData.venuePriceLevel || null,
            hostId: eventData.hostId || null,
            embedding: eventData.embedding || null,
            attendeesCount: eventData.attendeesCount,
            interestedCount: eventData.interestedCount
        }));

        const result = await database.insert(event).values(insertData).returning({ id: event.id });

        const insertedIds = result.map(r => r.id);
        console.log(`✅ Batch inserted ${insertedIds.length} events`);

        // Generate embeddings for events that don't have them
        const eventsNeedingEmbeddings = events.filter((eventData, index) => !eventData.embedding);

        if (eventsNeedingEmbeddings.length > 0) {
            console.log(`🧠 Generating embeddings for ${eventsNeedingEmbeddings.length} events...`);

            for (let i = 0; i < eventsNeedingEmbeddings.length; i++) {
                const eventData = eventsNeedingEmbeddings[i];
                const eventId = insertedIds[events.indexOf(eventData)];

                try {
                    console.log(`🔄 Generating embedding for event: ${eventData.title}`);
                    await updateEventEmbedding(
                        eventId,
                        eventData.title,
                        eventData.description,
                        eventData.categories
                    );
                    console.log(`✅ Generated embedding for event: ${eventData.title}`);
                } catch (embeddingError) {
                    console.warn(`⚠️ Failed to generate embedding for event ${eventData.title}:`, embeddingError);
                    // Don't fail the batch insertion if embedding generation fails
                }
            }
        }

        return insertedIds;
    } catch (error) {
        console.error(`❌ Error batch inserting ${events.length} events:`, error);
        throw error;
    }
}

/**
 * Get an event by its ID
 * @param id - The event ID
 * @returns Promise<Event | null> - The event or null if not found
 */
export async function getEventById(id: string): Promise<Event | null> {
    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    try {
        const result = await database.select().from(event).where(eq(event.id, id));

        if (result.length === 0) {
            return null;
        }

        const dbEvent = result[0];
        return {
            title: dbEvent.title,
            description: dbEvent.description,
            embeddingDescription: dbEvent.embeddingDescription || undefined,
            categories: dbEvent.categories,
            date: dbEvent.date,
            location: dbEvent.location as { lat: number; lng: number; neighborhood?: string },
            venue: dbEvent.venue as any,
            venueType: dbEvent.venueType || undefined,
            venueRating: dbEvent.venueRating ? dbEvent.venueRating / 10 : undefined,
            venuePriceLevel: dbEvent.venuePriceLevel || undefined,
            hostId: dbEvent.hostId || undefined,
            embedding: dbEvent.embedding || undefined,
            attendeesCount: dbEvent.attendeesCount,
            interestedCount: dbEvent.interestedCount
        };
    } catch (error) {
        console.error(`❌ Error getting event by ID ${id}:`, error);
        throw error;
    }
}

/**
 * Get events within a date range
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Promise<Event[]> - Array of events in the date range
 */
export async function getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    try {
        const result = await database.select().from(event).where(
            and(
                gte(event.date, startDate),
                lte(event.date, endDate)
            )
        );

        return result.map(dbEvent => ({
            title: dbEvent.title,
            description: dbEvent.description,
            embeddingDescription: dbEvent.embeddingDescription || undefined,
            categories: dbEvent.categories,
            date: dbEvent.date,
            location: dbEvent.location as { lat: number; lng: number; neighborhood?: string },
            venue: dbEvent.venue as any,
            venueType: dbEvent.venueType || undefined,
            venueRating: dbEvent.venueRating ? dbEvent.venueRating / 10 : undefined,
            venuePriceLevel: dbEvent.venuePriceLevel || undefined,
            hostId: dbEvent.hostId || undefined,
            embedding: dbEvent.embedding || undefined,
            attendeesCount: dbEvent.attendeesCount,
            interestedCount: dbEvent.interestedCount
        }));
    } catch (error) {
        console.error(`❌ Error getting events by date range ${startDate} to ${endDate}:`, error);
        throw error;
    }
}

/**
 * Get all events (for testing/debugging)
 * @returns Promise<Event[]> - Array of all events
 */
export async function getAllEvents(): Promise<Event[]> {
    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    try {
        const result = await database.select().from(event);

        return result.map(dbEvent => ({
            title: dbEvent.title,
            description: dbEvent.description,
            embeddingDescription: dbEvent.embeddingDescription || undefined,
            categories: dbEvent.categories,
            date: dbEvent.date,
            location: dbEvent.location as { lat: number; lng: number; neighborhood?: string },
            venue: dbEvent.venue as any,
            venueType: dbEvent.venueType || undefined,
            venueRating: dbEvent.venueRating ? dbEvent.venueRating / 10 : undefined,
            venuePriceLevel: dbEvent.venuePriceLevel || undefined,
            hostId: dbEvent.hostId || undefined,
            embedding: dbEvent.embedding || undefined,
            attendeesCount: dbEvent.attendeesCount,
            interestedCount: dbEvent.interestedCount
        }));
    } catch (error) {
        console.error('❌ Error getting all events:', error);
        throw error;
    }
}

/**
 * Delete an event by ID (for testing/cleanup)
 * @param id - The event ID to delete
 * @returns Promise<boolean> - True if deleted, false if not found
 */
export async function deleteEventById(id: string): Promise<boolean> {
    const database = initializeDatabase();
    if (!database) {
        throw new Error('Database not available');
    }

    try {
        const result = await database.delete(event).where(eq(event.id, id)).returning({ id: event.id });
        const deleted = result.length > 0;

        if (deleted) {
            console.log(`✅ Deleted event with ID: ${id}`);
        } else {
            console.log(`⚠️ Event with ID ${id} not found for deletion`);
        }

        return deleted;
    } catch (error) {
        console.error(`❌ Error deleting event with ID ${id}:`, error);
        throw error;
    }
} 