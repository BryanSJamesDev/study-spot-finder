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

// Export the router so it can be used in server.js
export default spotsRouter;
