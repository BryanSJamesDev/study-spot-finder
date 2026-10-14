import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { ObjectId } from "mongodb";
import spotsRouter from "../routes/spots.js";
import { connectDB, getDB, closeDB } from "../db.js";

const server = express();
let baseUrl;

server.use(express.json());
server.use("/api/spots", spotsRouter);

let listener;

/** Start the server before running tests */
before(async () => {
  await connectDB();
  listener = await new Promise((resolve) => {
    const serverInstance = server.listen(0, () => {
      resolve(serverInstance);
    });
  });
  baseUrl = `http://localhost:${listener.address().port}/api/spots`;
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

/** Test an invalid spot ID returns a 400 status code. */
test("invalid spot ID returns 400", async () => {
  const res = await fetch(`${baseUrl}/hello`);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid spot ID");
});

/** Test a valid spot ID that does not exist returns a 404 status code. */
test("nonexistent spot ID returns 404", async () => {
  const res = await fetch(`${baseUrl}/000000000000000000000000`);

  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.error, "Spot not found");
});

/** Test GET /api/spots returns a list of spots. */
test("GET /api/spots returns a list", async () => {
  const res = await fetch(baseUrl);

  assert.equal(res.status, 200);

  const body = await res.json();
  assert.ok(Array.isArray(body));
});

/** Test GET /api/spots/:id returns the spot when it exists. */
test("GET /api/spots/:id returns the spot", async () => {
  const { insertedId } = await getDB()
    .collection("spots")
    .insertOne({ name: "Test Spot for GET" });

  try {
    const res = await fetch(`${baseUrl}/${insertedId}`);

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.name, "Test Spot for GET");
  } finally {
    await getDB().collection("spots").deleteOne({ _id: insertedId });
  }
});

/** Test a 12-character invalid spot ID returns a 400 status code. */
test("12-character spot ID returns 400", async () => {
  const res = await fetch(`${baseUrl}/hello%20world!`);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid spot ID");
});

/** Test a database failure returns a 500 status code. */
test("database failure returns 500", async () => {
  await closeDB();

  try {
    const res = await fetch(baseUrl);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load spots");
  } finally {
    await connectDB();
  }
});

// Helper function to send POST requests with spot data
function postSpot(data) {
  return fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/** Test a valid spot returns 201 and trims extra spaces. */
test("valid spot returns 201", async () => {
  const res = await postSpot({
    name: "  Test Spot for POST  ",
    building: "  Snell Library  ",
    noiseLevel: "Quiet",
  });
  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.ok(body._id);
    assert.equal(body.name, "Test Spot for POST");
    assert.equal(body.building, "Snell Library");
  } finally {
    if (body._id) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(body._id) });
    }
  }
});

/** Test a missing name returns a 400 status code. */
test("missing name returns 400", async () => {
  const res = await postSpot({
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Name is required/);
});

/** Test a name containing only spaces returns a 400 status code. */
test("name with only spaces returns 400", async () => {
  const res = await postSpot({
    name: "   ",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Name is required/);
});

/** Test a name with the wrong type returns a 400 status code. */
test("name with the wrong type returns 400", async () => {
  const res = await postSpot({
    name: 123,
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Name is required/);
});
