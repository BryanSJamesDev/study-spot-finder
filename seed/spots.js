import { connectDB, getDB, closeDB } from "../db.js";
import { SEED_SPOTS } from "./spotsData.js";

/** Adds the sample spots to the database */
async function seedSpots() {
  try {
    // Connect to the database
    await connectDB();

    // Add each seed spot or update it if it already exists
    for (const spot of SEED_SPOTS) {
      await getDB()
        .collection("spots")
        .updateOne({ name: spot.name }, { $set: spot }, { upsert: true });
    }

    // Log how many spots were seeded
    console.log(`Seeded ${SEED_SPOTS.length} spots.`);
  } catch (error) {
    // Log any errors that occur
    console.error("Failed to seed spots", error);
  } finally {
    // Close the database connection
    await closeDB();
  }
}

seedSpots();
