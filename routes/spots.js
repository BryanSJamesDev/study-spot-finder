import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";

// Create a router to handle requests related to study spots
const spotsRouter = express.Router();

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

// Global noise levels
const NOISE_LEVELS = ["Quiet", "Moderate", "Loud"];

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

  // Return errors
  return errors;
}
// Export the router so it can be used in server.js
export default spotsRouter;
