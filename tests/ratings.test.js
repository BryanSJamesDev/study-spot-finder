import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { ObjectId } from "mongodb";
import ratingsRouter from "../routes/ratings.js";
import { connectDB, getDB, closeDB } from "../db.js";

const server = express();
let baseUrl;

server.use(express.json());
server.use("/api/ratings", ratingsRouter);

let listener;

/** Start the server before running tests */
before(async () => {
  await connectDB();
  listener = await new Promise((resolve) => {
    const serverInstance = server.listen(0, () => {
      resolve(serverInstance);
    });
  });
  baseUrl = `http://localhost:${listener.address().port}/api/ratings`;
});

/** Close the server after running tests */
after(async () => {
  await new Promise((resolve, reject) => {
    listener.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
  await closeDB();
});

/** HELPER FUNCTIONS */
// Helper function to send POST requests with rating data
function postRating(data) {
  return fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper function to send PUT requests with rating data
function putRating(id, data) {
  return fetch(`${baseUrl}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper function to send DELETE requests for a rating
function deleteRating(id) {
  return fetch(`${baseUrl}/${id}`, { method: "DELETE" });
}

// Helper function to remove a test rating from the database
async function removeRating(id) {
  if (id) {
    await getDB()
      .collection("ratings")
      .deleteOne({ _id: new ObjectId(id) });
  }
}

/** Test an invalid rating ID returns a 400 status code. */
test("invalid rating ID returns 400", async () => {
  const res = await fetch(`${baseUrl}/hello`);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid rating ID");
});

/** Test a 12-character invalid rating ID returns a 400 status code. */
test("12-character rating ID returns 400", async () => {
  const res = await fetch(`${baseUrl}/hello%20world!`);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid rating ID");
});

/** Test a valid rating ID that does not exist returns a 404 status code. */
test("nonexistent rating ID returns 404", async () => {
  const res = await fetch(`${baseUrl}/000000000000000000000000`);

  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.error, "Rating not found");
});

/** Test GET /api/ratings returns a list of ratings. */
test("GET /api/ratings returns a list", async () => {
  const res = await fetch(baseUrl);

  assert.equal(res.status, 200);

  const body = await res.json();
  assert.ok(Array.isArray(body));
});

/** Test GET /api/ratings/:id returns the rating when it exists. */
test("GET /api/ratings/:id returns the rating", async () => {
  const { insertedId } = await getDB()
    .collection("ratings")
    .insertOne({ spotName: "Test Spot for GET", stars: 3 });

  try {
    const res = await fetch(`${baseUrl}/${insertedId}`);

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.spotName, "Test Spot for GET");
    assert.equal(body.stars, 3);
  } finally {
    await getDB().collection("ratings").deleteOne({ _id: insertedId });
  }
});

/** Test GET /api/ratings?spotName= only returns ratings for that spot. */
test("GET with spotName filter returns only that spot", async () => {
  const { insertedIds } = await getDB()
    .collection("ratings")
    .insertMany([
      { spotName: "Test Spot for Filter", stars: 5 },
      { spotName: "Test Spot for Other Filter", stars: 2 },
    ]);
  const ids = Object.values(insertedIds);

  try {
    const res = await fetch(
      `${baseUrl}?spotName=${encodeURIComponent("Test Spot for Filter")}`,
    );

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].spotName, "Test Spot for Filter");
  } finally {
    await getDB()
      .collection("ratings")
      .deleteMany({ _id: { $in: ids } });
  }
});

/** Test GET /api/ratings/averages returns the average and count per spot. */
test("GET /api/ratings/averages returns average and count", async () => {
  const { insertedIds } = await getDB()
    .collection("ratings")
    .insertMany([
      { spotName: "Test Spot for Averages", stars: 4 },
      { spotName: "Test Spot for Averages", stars: 5 },
    ]);
  const ids = Object.values(insertedIds);

  try {
    const res = await fetch(`${baseUrl}/averages`);

    assert.equal(res.status, 200);

    const body = await res.json();
    const spot = body.find(
      (entry) => entry.spotName === "Test Spot for Averages",
    );

    assert.ok(spot);
    assert.equal(spot.average, 4.5);
    assert.equal(spot.count, 2);
  } finally {
    await getDB()
      .collection("ratings")
      .deleteMany({ _id: { $in: ids } });
  }
});

/** Test a valid rating returns 201, trims extra spaces, and adds createdAt. */
test("valid rating returns 201", async () => {
  const res = await postRating({
    spotName: "  Test Spot for POST  ",
    stars: 4,
  });
  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.ok(body._id);
    assert.equal(body.spotName, "Test Spot for POST");
    assert.equal(body.stars, 4);
    assert.ok(body.createdAt);
  } finally {
    await removeRating(body._id);
  }
});

/** Test the lowest and highest allowed star values are accepted. */
test("1 star and 5 stars are both accepted", async () => {
  const created = [];

  try {
    for (const stars of [1, 5]) {
      const res = await postRating({
        spotName: "Test Spot for Star Limits",
        stars,
      });
      const body = await res.json();
      created.push(body._id);

      assert.equal(res.status, 201);
      assert.equal(body.stars, stars);
    }
  } finally {
    for (const id of created) {
      await removeRating(id);
    }
  }
});

/** Test a missing spot name returns a 400 status code. */
test("missing spot name returns 400", async () => {
  const res = await postRating({ stars: 4 });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
});

/** Test a spot name containing only spaces returns a 400 status code. */
test("spot name with only spaces returns 400", async () => {
  const res = await postRating({ spotName: "   ", stars: 4 });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
});

/** Test a spot name with the wrong type returns a 400 status code. */
test("spot name with the wrong type returns 400", async () => {
  const res = await postRating({ spotName: 123, stars: 4 });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
});

/** Test missing stars returns a 400 status code. */
test("missing stars returns 400", async () => {
  const res = await postRating({ spotName: "Test Spot" });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Stars must be a whole number from 1 to 5/);
});

/** Test invalid star values return a 400 status code. */
test("invalid stars return 400", async () => {
  for (const stars of [0, 6, -1, 3.5, "4", null]) {
    const res = await postRating({ spotName: "Test Spot", stars });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Stars must be a whole number from 1 to 5/);
  }
});

/** Test an empty body returns both validation errors. */
test("empty body returns all validation errors", async () => {
  const res = await postRating({});

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
  assert.match(body.error, /Stars must be a whole number from 1 to 5/);
});

/** Test that updating a rating saves the changes and keeps createdAt. */
test("updating a rating saves the changes", async () => {
  const res = await postRating({
    spotName: "Test Spot for Update",
    stars: 2,
  });
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const updateRes = await putRating(created._id, {
      spotName: "Test Spot for Update",
      stars: 5,
    });

    assert.equal(updateRes.status, 200);

    const body = await updateRes.json();
    assert.equal(body.stars, 5);

    // Check that the changes were saved in the database.
    const getRes = await fetch(`${baseUrl}/${created._id}`);
    const savedRating = await getRes.json();

    assert.equal(getRes.status, 200);
    assert.equal(savedRating.stars, 5);
    assert.ok(savedRating.createdAt);
  } finally {
    await removeRating(created._id);
  }
});

/** Test that updating a rating with an invalid ID returns a 400 status. */
test("PUT with invalid ID returns 400", async () => {
  const res = await putRating("hello", {
    spotName: "Test Spot",
    stars: 4,
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid rating ID");
});

/** Test that updating a rating that does not exist returns a 404 status. */
test("PUT for a nonexistent rating returns 404", async () => {
  const res = await putRating("000000000000000000000000", {
    spotName: "Test Spot",
    stars: 4,
  });

  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.error, "Rating not found");
});

/** Test that updating a rating with invalid data returns a 400 status. */
test("PUT with invalid data returns 400", async () => {
  const res = await putRating("000000000000000000000000", {});

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
  assert.match(body.error, /Stars must be a whole number from 1 to 5/);
});

/** Test that deleting a rating returns 204 and removes it from the database. */
test("deleting a rating returns 204 and removes it", async () => {
  const res = await postRating({
    spotName: "Test Spot for Delete",
    stars: 3,
  });
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const deleteRes = await deleteRating(created._id);
    assert.equal(deleteRes.status, 204);

    const getRes = await fetch(`${baseUrl}/${created._id}`);
    assert.equal(getRes.status, 404);
  } finally {
    await removeRating(created._id);
  }
});

/** Test that deleting a rating twice returns 404 on the second attempt. */
test("deleting a rating twice returns 404 the second time", async () => {
  const res = await postRating({
    spotName: "Test Spot for Double Delete",
    stars: 3,
  });
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const firstDelete = await deleteRating(created._id);
    assert.equal(firstDelete.status, 204);

    const secondDelete = await deleteRating(created._id);
    assert.equal(secondDelete.status, 404);

    const body = await secondDelete.json();
    assert.equal(body.error, "Rating not found");
  } finally {
    await removeRating(created._id);
  }
});

/** Test that deleting with an invalid ID returns a 400 status. */
test("DELETE with invalid ID returns 400", async () => {
  const res = await deleteRating("hello");

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid rating ID");
});

/** Test that GET all returns a 500 status when the database fails. */
test("GET all returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(baseUrl);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load ratings");
  } finally {
    await connectDB();
  }
});

/** Test that GET averages returns a 500 status when the database fails. */
test("GET averages returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(`${baseUrl}/averages`);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load rating averages");
  } finally {
    await connectDB();
  }
});

/** Test that GET one returns a 500 status when the database fails. */
test("GET one returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(`${baseUrl}/000000000000000000000000`);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load rating");
  } finally {
    await connectDB();
  }
});

/** Test that POST returns a 500 status when the database fails. */
test("POST returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await postRating({
      spotName: "Test Spot for Database Failure",
      stars: 4,
    });

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to create rating");
  } finally {
    await connectDB();
  }
});

/** Test that PUT returns a 500 status when the database fails. */
test("PUT returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await putRating("000000000000000000000000", {
      spotName: "Test Spot",
      stars: 4,
    });

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to update rating");
  } finally {
    await connectDB();
  }
});

/** Test that DELETE returns a 500 status when the database fails. */
test("DELETE returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await deleteRating("000000000000000000000000");

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to delete rating");
  } finally {
    await connectDB();
  }
});
