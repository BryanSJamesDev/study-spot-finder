import { connectDB, getDB, closeDB } from "../db.js";
import { CROWD_LEVELS, getCampusDayAndHour } from "../ml/crowd.js";
import { SEED_SPOTS } from "./spotsData.js";

/** GLOBAL VARIABLES */
// How many older and recent check-ins to create for each spot
const PAST_CHECKINS_PER_SPOT = 27;
const RECENT_CHECKINS_PER_SPOT = 3;

// Older check-ins are spread over the last 4 weeks
const DAYS_BACK = 28;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Recent check-ins are from the last 90 minutes, so "crowded now" has data
const RECENT_WINDOW_MINUTES = 90;

// Older check-ins happen during the day, from 8am to 10pm
const FIRST_HOUR = 8;
const LAST_HOUR = 22;

// Loud spots tend to be busier than quiet ones
const NOISE_BUSYNESS = { Quiet: 0.8, Moderate: 0.95, Loud: 1.1 };

// Short notes that match each crowd level
const NOTES = {
  "Not busy": [
    "plenty of room",
    "pretty chill right now",
    "found a whole table",
  ],
  Moderate: ["a few open seats", "getting busier", "found a spot by the wall"],
  "Very busy": ["no seats left", "outlets are all taken", "line out the door"],
};

/** HELPER FUNCTIONS */
// Returns a random number between min and max
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Returns a random item from a list
function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Returns a random time in the last 4 weeks, during the day in campus time
function randomPastTime() {
  let createdAt;
  let hour;

  // Keep picking until the hour is between 8am and 10pm
  do {
    createdAt = new Date(Date.now() - Math.random() * DAYS_BACK * DAY_MS);
    hour = getCampusDayAndHour(createdAt).hour;
  } while (hour < FIRST_HOUR || hour > LAST_HOUR);

  return createdAt;
}

// Returns a random time in the last 90 minutes
function randomRecentTime() {
  return new Date(
    Date.now() - Math.random() * RECENT_WINDOW_MINUTES * MINUTE_MS,
  );
}

// How busy campus usually is at an hour, from 0 to 1
function hourBusyness(hour) {
  if (hour < 10) return 0.3;
  if (hour < 12) return 0.6;
  if (hour < 16) return 0.85;
  if (hour < 18) return 0.65;
  if (hour < 20) return 0.45;
  return 0.25;
}

// Picks a crowd level based on the spot, the day, and the hour
function pickCrowdLevel(spot, day, hour) {
  // Weekends are quieter than weekdays
  const weekend = day === "Saturday" || day === "Sunday" ? 0.6 : 1;

  // Add some randomness so the same time is not always the same level
  const busyness =
    hourBusyness(hour) * weekend * NOISE_BUSYNESS[spot.noiseLevel] +
    randomBetween(-0.2, 0.2);

  if (busyness < 0.4) return CROWD_LEVELS[0];
  if (busyness < 0.7) return CROWD_LEVELS[1];
  return CROWD_LEVELS[2];
}

// Builds one check-in for a spot at a time
function buildCheckin(spot, createdAt) {
  // Same day and hour the server would have set for this time
  const { day, hour } = getCampusDayAndHour(createdAt);
  const crowdLevel = pickCrowdLevel(spot, day, hour);

  return {
    spotName: spot.name,
    crowdLevel,
    day,
    hour,
    note: Math.random() < 0.25 ? pickOne(NOTES[crowdLevel]) : null,
    createdAt,
    seeded: true,
  };
}

// Builds all the check-ins for one spot
function buildCheckins(spot) {
  const past = Array.from({ length: PAST_CHECKINS_PER_SPOT }, () =>
    buildCheckin(spot, randomPastTime()),
  );
  const recent = Array.from({ length: RECENT_CHECKINS_PER_SPOT }, () =>
    buildCheckin(spot, randomRecentTime()),
  );

  return [...past, ...recent];
}

/** Adds sample check-ins for every seed spot to the database */
async function seedCheckins() {
  try {
    // Connect to the database
    await connectDB();
    const collection = getDB().collection("checkins");

    // Remove check-ins from an earlier run, check-ins added through the app stay
    await collection.deleteMany({ seeded: true });

    // Build and add the check-ins for every spot
    const checkins = SEED_SPOTS.flatMap((spot) => buildCheckins(spot));
    await collection.insertMany(checkins);

    // Log how many check-ins were seeded
    console.log(`Seeded ${checkins.length} check-ins.`);
  } catch (error) {
    // Log any errors that occur
    console.error("Failed to seed check-ins", error);
  } finally {
    // Close the database connection
    await closeDB();
  }
}

seedCheckins();
