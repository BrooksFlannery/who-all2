import { drizzle } from "drizzle-orm/neon-http";

// Load environment variables early
if (typeof window === "undefined") {
    try {
        require("dotenv").config();
    } catch (error) {
        // dotenv might not be available in all environments
    }
}

function isServer() {
    // window is undefined in Node.js
    return typeof window === "undefined";
}

let db: ReturnType<typeof drizzle> | undefined;

if (isServer()) {
    // Use dynamic require to avoid bundling the serverless driver in the browser bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { neon } = require("@neondatabase/serverless");

    const connectionString =
        process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL || "";

    if (!connectionString) {
        console.warn(
            "DATABASE_URL is not defined. Skipping database initialization."
        );
    } else {
        const sql = neon(connectionString);
        db = drizzle(sql);
    }
}

// Export `db` for server-side usage. On the client, this will be undefined.
// Make sure to guard against undefined when importing from client-side code.
export { db };
