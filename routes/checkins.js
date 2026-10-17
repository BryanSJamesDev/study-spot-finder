import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import { CROWD_LEVELS, crowdToScore, scoreToCrowd } from "../ml/crowd.js";

// Create a router to handle requests related to check-ins
const checkinsRouter = express.Router();

/** GLOBAL VARIABLES */
// Days of the week a check-in can be for
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Longest note allowed
const MAX_NOTE_LENGTH = 200;

// "Crowded now" looks at check-ins from the last 2 hours
const CROWDED_NOW_WINDOW_MS = 2 * 60 * 60 * 1000;

/** HELPER FUNCTIONS */
// Helper function that takes check-in data and returns a list of error messages
function validateCheckin(checkin) {
  const errors = [];

  // Check that spotName is not an empty string
  if (typeof checkin.spotName !== "string" || checkin.spotName.trim() === "") {
    errors.push("Spot name is required");
  }

  // Check that crowdLevel is one of the select values
  if (!CROWD_LEVELS.includes(checkin.crowdLevel)) {
    errors.push(
      "Crowd level must be one of the following: Not busy, Moderate, or Very busy",
    );
  }

  // Check that day is a day of the week
  if (!DAYS.includes(checkin.day)) {
    errors.push("Day must be a day of the week, like Monday");
  }

  // Check that hour is a whole number from 0 to 23
  if (
    typeof checkin.hour !== "number" ||
    !Number.isInteger(checkin.hour) ||
    checkin.hour < 0 ||
    checkin.hour > 23
  ) {
    errors.push("Hour must be a whole number from 0 to 23");
  }

  // Check that note is short text if provided
  if (
    checkin.note !== undefined &&
    (typeof checkin.note !== "string" || checkin.note.length > MAX_NOTE_LENGTH)
  ) {
    errors.push("Note must be text of 200 characters or fewer");
  }

  // Return errors
  return errors;
}

// Helper function to build a check-in to be used by POST and PUT
function buildCheckin(checkin) {
  // Empty notes are saved as null
  const note = (checkin.note ?? "").trim();

  // Build new check-in from allowable fields
  const newCheckin = {
    spotName: checkin.spotName.trim(),
    crowdLevel: checkin.crowdLevel,
    day: checkin.day,
    hour: checkin.hour,
    note: note === "" ? null : note,
  };
  return newCheckin;
}

/** CRUD */
// Handle GET requests to /api/checkins which returns check-ins, newest first
// Optional filters: /api/checkins?spotName=Snell Library&limit=20
checkinsRouter.get("/", async (req, res) => {
  try {
    // Only filter by spot name if one was provided
    const filter = req.query.spotName ? { spotName: req.query.spotName } : {};

    // Get matching documents from the "checkins" collection, newest first
    let cursor = getDB()
      .collection("checkins")
      .find(filter)
      .sort({ createdAt: -1 });

    // Only limit the results if a valid limit was provided
    const limit = Number(req.query.limit);
    if (Number.isInteger(limit) && limit > 0) {
      cursor = cursor.limit(limit);
    }

    // Send the list of check-ins back as a JSON response
    res.json(await cursor.toArray());
  } catch (error) {
    // Log the error if loading the check-ins fails
    console.error("Failed to load check-ins", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load check-ins" });
  }
});

// Handle GET requests to /api/checkins/crowded-now which returns how busy each spot is right now
// This has to stay above /:id or "crowded-now" would be treated as an ID
checkinsRouter.get("/crowded-now", async (req, res) => {
  try {
    // Only look at check-ins from the last 2 hours
    const filter = {
      createdAt: { $gte: new Date(Date.now() - CROWDED_NOW_WINDOW_MS) },
    };

    // Only filter by spot name if one was provided
    if (req.query.spotName) {
      filter.spotName = req.query.spotName;
    }

    const recent = await getDB().collection("checkins").find(filter).toArray();

    // Add up the crowd scores for each spot
    const totals = new Map();
    for (const checkin of recent) {
      const score = crowdToScore(checkin.crowdLevel);
      if (score === null) {
        continue;
      }
      const total = totals.get(checkin.spotName) ?? { sum: 0, count: 0 };
      total.sum += score;
      total.count += 1;
      totals.set(checkin.spotName, total);
    }

    // Turn each total into an average and the closest crowd level
    const crowded = [...totals]
      .map(([spotName, { sum, count }]) => {
        const average = sum / count;
        return {
          spotName,
          crowdLevel: scoreToCrowd(average),
          average: Math.round(average * 10) / 10,
          count,
        };
      })
      .sort((a, b) => a.spotName.localeCompare(b.spotName));

    // Send the results back as a JSON response
    res.json(crowded);
  } catch (error) {
    // Log the error if computing the crowd levels fails
    console.error("Failed to load crowd levels", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load crowd levels" });
  }
});

// Handle GET requests to /api/checkins/:id which returns one check-in based off an ID
checkinsRouter.get("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid check-in ID" });
  }

  try {
    // Find one check-in
    const checkin = await getDB()
      .collection("checkins")
      .findOne({ _id: new ObjectId(req.params.id) });

    // If check-in is not found return a message saying it was not found
    if (!checkin) {
      return res.status(404).json({ error: "Check-in not found" });
    }
    // Otherwise, return the check-in that was found
    return res.json(checkin);
  } catch (error) {
    // Log the error if loading the check-in fails
    console.error("Failed to load check-in", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load check-in" });
  }
});

// Handle POST requests to /api/checkins which adds a check-in
checkinsRouter.post("/", async (req, res) => {
  // Get a check-in from the body
  const checkin = req.body ?? {};

  // Validate the check-in using the helper function
  const errors = validateCheckin(checkin);

  // If there are errors return the status and the error
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors.join(", "),
    });
  }

  try {
    // Build new check-in using helper function and stamp the creation time
    const newCheckin = { ...buildCheckin(checkin), createdAt: new Date() };

    // Insert the new check-in
    const result = await getDB().collection("checkins").insertOne(newCheckin);

    // Return the check-in
    res.status(201).json({ _id: result.insertedId, ...newCheckin });
  } catch (error) {
    // Log the error if creating the check-in fails
    console.error("Failed to create check-in", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to create check-in" });
  }
});

// Handle PUT requests to /api/checkins/:id which updates one check-in based off an ID
checkinsRouter.put("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid check-in ID" });
  }

  // Define check-in
  const checkin = req.body ?? {};

  // Validate the check-in using the helper function
  const errors = validateCheckin(checkin);

  // If there are errors return the status and the error
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors.join(", "),
    });
  }

  try {
    // Convert the ID
    const id = new ObjectId(req.params.id);

    // Build updated check-in (createdAt is left alone)
    const updatedCheckin = buildCheckin(checkin);

    // Update the check-in with the new updated check-in
    const result = await getDB()
      .collection("checkins")
      .updateOne({ _id: id }, { $set: updatedCheckin });

    // If check-in doesn't exist return with check-in not found
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Check-in not found" });
    }

    // Send back check-in
    return res.json({ _id: id, ...updatedCheckin });
  } catch (error) {
    // Log the error if updating the check-in fails
    console.error("Failed to update check-in", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to update check-in" });
  }
});

// Handle DELETE requests to /api/checkins/:id which deletes one check-in based off an ID
checkinsRouter.delete("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid check-in ID" });
  }

  try {
    // Find the check-in and delete it
    const result = await getDB()
      .collection("checkins")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    // If nothing was deleted then return check-in not found
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Check-in not found" });
    }

    // Otherwise send back done, nothing left to send
    return res.status(204).end();
  } catch (error) {
    // Log the error if deleting the check-in fails
    console.error("Failed to delete check-in", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to delete check-in" });
  }
});

// Export the router so it can be used in server.js
export default checkinsRouter;
