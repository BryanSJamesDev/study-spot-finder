import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";

// Create a router to handle requests related to study spots
const spotsRouter = express.Router();

/** GLOBAL VARIABLES */
// Global noise levels
const NOISE_LEVELS = ["Quiet", "Moderate", "Loud"];

/** HELPER FUNCTIONS */
// Helper function that takes spot data and returns a list of error messages
function validateSpot(spot) {
  const errors = [];

  // Check if name is not an empty string
  if (typeof spot.name !== "string" || spot.name.trim() === "") {
    errors.push("Name is required");
  }

  // Check that building is not an empty string
  if (typeof spot.building !== "string" || spot.building.trim() === "") {
    errors.push("Building is required");
  }

  // Check that noiseLevel is one of the select values
  if (!NOISE_LEVELS.includes(spot.noiseLevel)) {
    errors.push(
      "Noise level must be one of the following: Quiet, Moderate, or Loud",
    );
  }

  // Check that outlets is a boolean if provided
  if (spot.outlets !== undefined && typeof spot.outlets !== "boolean") {
    errors.push("Outlets must be true or false");
  }

  // Check that wifi is a boolean if provided
  if (spot.wifi !== undefined && typeof spot.wifi !== "boolean") {
    errors.push("Wi-Fi must be true or false");
  }

  // Check that closingTime is in HH:MM format if provided
  if (
    spot.closingTime !== undefined &&
    (typeof spot.closingTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(spot.closingTime))
  ) {
    errors.push("Closing time must be in HH:MM format");
  }

  // Check that tags is a list of non-empty strings if provided
  if (
    spot.tags !== undefined &&
    (!Array.isArray(spot.tags) ||
      !spot.tags.every((tag) => typeof tag === "string" && tag.trim() !== ""))
  ) {
    errors.push("Tags must be a list of words");
  }

  // Return errors
  return errors;
}

// Helper function build spot to be used by POST and PUT
function buildSpot(spot) {
  // Build new spot from allowable fields
  const newSpot = {
    name: spot.name.trim(),
    building: spot.building.trim(),
    noiseLevel: spot.noiseLevel,
    outlets: spot.outlets ?? false,
    wifi: spot.wifi ?? false,
    closingTime: spot.closingTime ?? null,
    tags: (spot.tags ?? []).map((tag) => tag.trim()),
  };
  return newSpot;
}
/** CRUD */
// Handle GET requests to /api/spots which returns every spot
spotsRouter.get("/", async (req, res) => {
  try {
    // Get all documents from the "spots" collection in the database
    const spots = await getDB().collection("spots").find().toArray();

    // Send the list of spots back as a JSON response
    res.json(spots);
  } catch (error) {
    // Log the error if loading the spots fails
    console.error("Failed to load spots", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load spots" });
  }
});

// Handle GET requests to /api/spots/:id which returns one spot based off an ID
spotsRouter.get("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid spot ID" });
  }

  try {
    // Find one spot
    const spot = await getDB()
      .collection("spots")
      .findOne({ _id: new ObjectId(req.params.id) });

    // If spot is not found return a message saying the spot was not found
    if (!spot) {
      return res.status(404).json({ error: "Spot not found" });
    }
    // Otherwise, return the spot that was found
    return res.json(spot);
  } catch (error) {
    // Log the error if loading the spot fails
    console.error("Failed to load spot", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load spot" });
  }
});

// Handle POST requests to /api/spots which adds a spot
spotsRouter.post("/", async (req, res) => {
  // Get a spot from the body
  const spot = req.body ?? {};

  // Validate the spot using the helper function
  const errors = validateSpot(spot);

  // If there are errors return the status and the error
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors.join(", "),
    });
  }
  try {
    // Check for duplicate name
    const existing = await getDB()
      .collection("spots")
      .findOne({ name: spot.name.trim() });

    if (existing) {
      return res
        .status(409)
        .json({ error: "A spot with that name already exists" });
    }

    // Build new spot using helper function
    const newSpot = buildSpot(spot);

    // Insert the new spot
    const result = await getDB().collection("spots").insertOne(newSpot);

    // Return the spot
    res.status(201).json({ _id: result.insertedId, ...newSpot });
  } catch (error) {
    // Log the error if creating the spot fails
    console.error("Failed to create spot", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to create spot" });
  }
});
// Export the router so it can be used in server.js
export default spotsRouter;
