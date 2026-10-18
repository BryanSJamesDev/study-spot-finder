import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import {
  CROWD_LEVELS,
  crowdToScore,
  scoreToCrowd,
  getCampusDayAndHour,
} from "../ml/crowd.js";

// Create a router to handle requests related to check-ins
const checkinsRouter = express.Router();

/** GLOBAL VARIABLES */
// Longest note allowed
const MAX_NOTE_LENGTH = 200;

// Most check-ins one request can ask for
const MAX_LIMIT = 100;

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
// Day and hour are not built here, the server sets them when a check-in is created
function buildCheckin(checkin) {
  // Empty notes are saved as null
  const note = (checkin.note ?? "").trim();

  // Build new check-in from allowable fields
  const newCheckin = {
    spotName: checkin.spotName.trim(),
    crowdLevel: checkin.crowdLevel,
    note: note === "" ? null : note,
  };
  return newCheckin;
}

/** CRUD */
// Handle GET requests to /api/checkins which returns check-ins, newest first
// Optional filters: /api/checkins?spotName=Snell Library&limit=20
checkinsRouter.get("/", async (req, res) => {
  // Check that the limit is a whole number from 1 to 100 if provided
  const rawLimit = req.query.limit;
  let limit = null;

  if (rawLimit !== undefined) {
    limit =
      typeof rawLimit === "string" && /^\d+$/.test(rawLimit)
        ? Number(rawLimit)
        : NaN;

    if (!(limit >= 1 && limit <= MAX_LIMIT)) {
      return res
        .status(400)
        .json({ error: "Limit must be a whole number from 1 to 100" });
    }
  }

  try {
    // Only filter by spot name if one was provided
    const filter = req.query.spotName ? { spotName: req.query.spotName } : {};

    // Get matching documents from the "checkins" collection, newest first
    let cursor = getDB()
      .collection("checkins")
      .find(filter)
      .sort({ createdAt: -1 });

    // Only limit the results if a limit was provided
    if (limit !== null) {
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
// This route has to stay above /:id. Express checks routes in order, so if /:id
// came first, "crowded-now" would be treated as a check-in ID and return a 400.
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
    // The server sets the time, so nobody can check in for a time that is not now
    const createdAt = new Date();
    const { day, hour } = getCampusDayAndHour(createdAt);

    // Build new check-in using helper function and add the time fields
    const newCheckin = { ...buildCheckin(checkin), day, hour, createdAt };

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
// Day, hour, and createdAt are left alone, only the spot, crowd level, and note change
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

    // Build updated check-in
    const updatedCheckin = buildCheckin(checkin);

    // Update the check-in with the new updated check-in
    const collection = getDB().collection("checkins");
    const result = await collection.updateOne(
      { _id: id },
      { $set: updatedCheckin },
    );

    // If check-in doesn't exist return with check-in not found
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Check-in not found" });
    }

    // Send back the saved check-in
    return res.json(await collection.findOne({ _id: id }));
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
