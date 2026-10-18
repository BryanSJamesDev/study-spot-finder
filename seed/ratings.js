import { connectDB, getDB, closeDB } from "../db.js";
import { SEED_SPOTS } from "./spotsData.js";

/** GLOBAL VARIABLES */
// How many ratings to create for each spot
const RATINGS_PER_SPOT = 20;

// Ratings are spread over the last 60 days
const DAYS_BACK = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** HELPER FUNCTIONS */
// Returns a random number between min and max
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Builds the ratings for one spot
function buildRatings(spotName) {
  // Each spot gets its own typical rating, so the averages are not all the same
  const typical = randomBetween(2.5, 4.7);
  const ratings = [];

  for (let i = 0; i < RATINGS_PER_SPOT; i++) {
    // Ratings land near the typical rating, as whole stars from 1 to 5
    const stars = Math.round(typical + randomBetween(-1.2, 1.2));

    ratings.push({
      spotName,
      stars: Math.min(Math.max(stars, 1), 5),
      createdAt: new Date(Date.now() - Math.random() * DAYS_BACK * DAY_MS),
      seeded: true,
    });
  }

  return ratings;
}

/** Adds sample ratings for every seed spot to the database */
async function seedRatings() {
  try {
    // Connect to the database
    await connectDB();
    const collection = getDB().collection("ratings");

    // Remove ratings from an earlier run, ratings added through the app stay
    await collection.deleteMany({ seeded: true });

    // Build and add the ratings for every spot
    const ratings = SEED_SPOTS.flatMap((spot) => buildRatings(spot.name));
    await collection.insertMany(ratings);

    // Log how many ratings were seeded
    console.log(`Seeded ${ratings.length} ratings.`);
  } catch (error) {
    // Log any errors that occur
    console.error("Failed to seed ratings", error);
  } finally {
    // Close the database connection
    await closeDB();
  }
}

seedRatings();
