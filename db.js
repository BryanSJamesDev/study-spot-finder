import "dotenv/config";
import { MongoClient } from "mongodb";

// Throw error if no Mongo URI in env
if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
}
// Starts the MongoClient with the connection URI
const client = new MongoClient(process.env.MONGO_URI);

// Global variable for database set to null initially
let db = null;

/**
 * Connects to the MongoDB and sets the global database.
 */
async function connectDB() {
    await client.connect();
    db = client.db("studySpotFinder");
    console.log("Connected");
}

/**
 * Retrieves the connected database.
 * @returns {Db} The connected MongoDB database instance.
 * @throws {Error} If the database connection has not been established.
 */
function getDB() {
    if (db === null) {
        throw new Error("You are not connected");
    }
    return db;
}

// Exports both connectDB and getDB
export { connectDB, getDB };