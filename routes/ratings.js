import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";

// Create a router to handle requests related to ratings
const ratingsRouter = express.Router();

/** HELPER FUNCTIONS */
// Helper function that takes rating data and returns a list of error messages
function validateRating(rating) {
  const errors = [];

  // Check that spotName is not an empty string
  if (typeof rating.spotName !== "string" || rating.spotName.trim() === "") {
    errors.push("Spot name is required");
  }

  // Check that stars is a whole number from 1 to 5
  if (
    typeof rating.stars !== "number" ||
    !Number.isInteger(rating.stars) ||
    rating.stars < 1 ||
    rating.stars > 5
  ) {
    errors.push("Stars must be a whole number from 1 to 5");
  }

  // Return errors
  return errors;
}

// Helper function to build a rating to be used by POST and PUT
function buildRating(rating) {
  // Build new rating from allowable fields
  const newRating = {
    spotName: rating.spotName.trim(),
    stars: rating.stars,
  };
  return newRating;
}

/** CRUD */
// Handle GET requests to /api/ratings which returns every rating
// Optional filter: /api/ratings?spotName=Snell Library
ratingsRouter.get("/", async (req, res) => {
  try {
    // Only filter by spot name if one was provided
    const filter = req.query.spotName ? { spotName: req.query.spotName } : {};

    // Get matching documents from the "ratings" collection, newest first
    const ratings = await getDB()
      .collection("ratings")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Send the list of ratings back as a JSON response
    res.json(ratings);
  } catch (error) {
    // Log the error if loading the ratings fails
    console.error("Failed to load ratings", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load ratings" });
  }
});

// Handle GET requests to /api/ratings/averages which returns the average per spot
// This has to stay above /:id or "averages" would be treated as an ID
ratingsRouter.get("/averages", async (req, res) => {
  try {
    // Group ratings by spot name and compute the average and count
    const averages = await getDB()
      .collection("ratings")
      .aggregate([
        {
          $group: {
            _id: "$spotName",
            average: { $avg: "$stars" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            spotName: "$_id",
            average: { $round: ["$average", 1] },
            count: 1,
          },
        },
        { $sort: { spotName: 1 } },
      ])
      .toArray();

    // Send the averages back as a JSON response
    res.json(averages);
  } catch (error) {
    // Log the error if computing the averages fails
    console.error("Failed to load rating averages", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load rating averages" });
  }
});

// Handle GET requests to /api/ratings/:id which returns one rating based off an ID
ratingsRouter.get("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid rating ID" });
  }

  try {
    // Find one rating
    const rating = await getDB()
      .collection("ratings")
      .findOne({ _id: new ObjectId(req.params.id) });

    // If rating is not found return a message saying the rating was not found
    if (!rating) {
      return res.status(404).json({ error: "Rating not found" });
    }
    // Otherwise, return the rating that was found
    return res.json(rating);
  } catch (error) {
    // Log the error if loading the rating fails
    console.error("Failed to load rating", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to load rating" });
  }
});

// Handle POST requests to /api/ratings which adds a rating
ratingsRouter.post("/", async (req, res) => {
  // Get a rating from the body
  const rating = req.body ?? {};

  // Validate the rating using the helper function
  const errors = validateRating(rating);

  // If there are errors return the status and the error
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors.join(", "),
    });
  }

  try {
    // Build new rating using helper function and stamp the creation time
    const newRating = { ...buildRating(rating), createdAt: new Date() };

    // Insert the new rating
    const result = await getDB().collection("ratings").insertOne(newRating);

    // Return the rating
    res.status(201).json({ _id: result.insertedId, ...newRating });
  } catch (error) {
    // Log the error if creating the rating fails
    console.error("Failed to create rating", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to create rating" });
  }
});

// Handle PUT requests to /api/ratings/:id which updates one rating based off an ID
ratingsRouter.put("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid rating ID" });
  }

  // Define rating
  const rating = req.body ?? {};

  // Validate the rating using the helper function
  const errors = validateRating(rating);

  // If there are errors return the status and the error
  if (errors.length > 0) {
    return res.status(400).json({
      error: errors.join(", "),
    });
  }

  try {
    // Convert the ID
    const id = new ObjectId(req.params.id);

    // Build updated rating (createdAt is left alone)
    const updatedRating = buildRating(rating);

    // Update the rating with the new updated rating
    const result = await getDB()
      .collection("ratings")
      .updateOne({ _id: id }, { $set: updatedRating });

    // If rating doesn't exist return with rating not found
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Rating not found" });
    }

    // Send back rating
    return res.json({ _id: id, ...updatedRating });
  } catch (error) {
    // Log the error if updating the rating fails
    console.error("Failed to update rating", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to update rating" });
  }
});

// Handle DELETE requests to /api/ratings/:id which deletes one rating based off an ID
ratingsRouter.delete("/:id", async (req, res) => {
  // Check if ID is not valid
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid rating ID" });
  }

  try {
    // Find the rating and delete it
    const result = await getDB()
      .collection("ratings")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    // If nothing was deleted then return rating not found
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Rating not found" });
    }

    // Otherwise send back done, nothing left to send
    return res.status(204).end();
  } catch (error) {
    // Log the error if deleting the rating fails
    console.error("Failed to delete rating", error);

    // Return a 500 status code to indicate a server error
    res.status(500).json({ error: "Failed to delete rating" });
  }
});

// Export the router so it can be used in server.js
export default ratingsRouter;
