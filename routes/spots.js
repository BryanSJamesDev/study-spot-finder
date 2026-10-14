import express from "express";
import { getDB } from "../db.js";

// Create a router to handle requests related to study spots
const spotsRouter = express.Router();

// Handle GET requests to /api/spots
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

// Export the router so it can be used in server.js
export default spotsRouter;
