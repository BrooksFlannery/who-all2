import { drizzle } from "drizzle-orm/neon-http";
import { validateEnv } from "../validation";

function isServer() {
    // window is undefined in Node.js
    return typeof window === "undefined";
}

let db: ReturnType<typeof drizzle> | undefined;

function initializeDatabase() {
    if (!db && isServer()) {
        // Use dynamic require to avoid bundling the serverless driver in the browser bundle
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { neon } = require("@neondatabase/serverless");

        // Validate environment variables
        const env = validateEnv();
        const connectionString = env.DATABASE_URL;

        if (!connectionString) {
            console.warn(
                "DATABASE_URL is not defined. Skipping database initialization."
            );
        } else {
            const sql = neon(connectionString);
            db = drizzle(sql);
        }
    }
    return db;
}

// Export `db` for server-side usage. On the client, this will be undefined.
// Make sure to guard against undefined when importing from client-side code.
export { db, initializeDatabase };
