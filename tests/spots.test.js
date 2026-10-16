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

/** HELPER FUNCTIONS */
// Helper function to send POST requests with spot data
function postSpot(data) {
  return fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper function to send PUT requests with spot data
function putSpot(id, data) {
  return fetch(`${baseUrl}/${id}`, {
    method: "PUT",
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

/** Test a missing building returns a 400 status code. */
test("missing building returns 400", async () => {
  const res = await postSpot({
    name: "Test Spot",
    noiseLevel: "Quiet",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Building is required/);
});

/** Test an invalid noise level returns a 400 status code. */
test("wrong noise level returns 400", async () => {
  const res = await postSpot({
    name: "Test Spot",
    building: "Snell Library",
    noiseLevel: "quiet",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Noise level/);
});

/** Test an empty body returns all three validation errors. */
test("empty body returns all validation errors", async () => {
  const res = await postSpot({});

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Name is required/);
  assert.match(body.error, /Building is required/);
  assert.match(body.error, /Noise level/);
});

/** Test a duplicate spot name returns a 409 status code. */
test("duplicate spot name returns 409", async () => {
  const firstRes = await postSpot({
    name: "Test Spot for Duplicate",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });
  const first = await firstRes.json();

  try {
    const res = await postSpot({
      name: "  Test Spot for Duplicate  ",
      building: "Snell Library",
      noiseLevel: "Quiet",
    });

    assert.equal(res.status, 409);

    const body = await res.json();
    assert.equal(body.error, "A spot with that name already exists");
  } finally {
    if (first._id) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(first._id) });
    }
  }
});

/** Test an invalid outlets value returns a 400 status code. */
test("wrong outlets type returns 400", async () => {
  const res = await postSpot({
    name: "Test Spot for Outlets Type",
    building: "Snell Library",
    noiseLevel: "Quiet",
    outlets: "yes",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Outlets must be true or false/);
});

/** Test an invalid Wi-Fi value returns a 400 status code. */
test("wrong Wi-Fi type returns 400", async () => {
  const res = await postSpot({
    name: "Test Spot for Wi-Fi Type",
    building: "Snell Library",
    noiseLevel: "Quiet",
    wifi: 1,
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Wi-Fi must be true or false/);
});

/** Test outlets saves its value and wifi defaults to false. */
test("outlets and wifi values are saved correctly", async () => {
  const res = await postSpot({
    name: "Test Spot for Defaults",
    building: "Snell Library",
    noiseLevel: "Quiet",
    outlets: true,
  });

  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.equal(body.outlets, true);
    assert.equal(body.wifi, false);
  } finally {
    if (body._id) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(body._id) });
    }
  }
});

/**
 * Test that invalid closing times return a 400 status.
 */
test("invalid closing times return 400", async () => {
  for (const closingTime of ["25:00", "10pm", "9:00", 2200]) {
    const res = await postSpot({
      name: "Test Spot",
      building: "Snell Library",
      noiseLevel: "Quiet",
      closingTime,
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Closing time/);
  }
});

/**
 * Test that invalid tags return a 400 status.
 */
test("invalid tags return 400", async () => {
  for (const tags of ["quiet", ["quiet", ""], ["quiet", 5]]) {
    const res = await postSpot({
      name: "Test Spot",
      building: "Snell Library",
      noiseLevel: "Quiet",
      tags,
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Tags must be a list of words/);
  }
});

/**
 * Test that closing time and tags save correctly.
 */
test("closing time and tags save correctly", async () => {
  const res = await postSpot({
    name: "Test Spot for Time and Tags",
    building: "Snell Library",
    noiseLevel: "Quiet",
    closingTime: "22:00",
    tags: ["  quiet zone  ", "outlets"],
  });

  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.equal(body.closingTime, "22:00");
    assert.deepEqual(body.tags, ["quiet zone", "outlets"]);
  } finally {
    if (body._id) {
      await getDB()
        .collection("spots")
        .deleteOne({
          _id: new ObjectId(body._id),
        });
    }
  }
});

/**
 * Test that updating a spot saves the changes.
 */
test("updating a spot saves the changes", async () => {
  const res = await postSpot({
    name: "Test Spot for Update",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const updateRes = await putSpot(created._id, {
      name: "Test Spot for Update",
      building: "Snell Library",
      noiseLevel: "Loud",
      closingTime: "20:00",
    });

    assert.equal(updateRes.status, 200);

    const body = await updateRes.json();

    assert.equal(body.noiseLevel, "Loud");
    assert.equal(body.closingTime, "20:00");

    // Check that the changes were saved in the database.
    const getRes = await fetch(`${baseUrl}/${created._id}`);
    const savedSpot = await getRes.json();

    assert.equal(getRes.status, 200);
    assert.equal(savedSpot.noiseLevel, "Loud");
  } finally {
    if (created._id) {
      await getDB()
        .collection("spots")
        .deleteOne({
          _id: new ObjectId(created._id),
        });
    }
  }
});

/**
 * Test that updating a spot with an invalid ID returns a 400 status.
 */
test("PUT with invalid ID returns 400", async () => {
  const res = await putSpot("hello", {
    name: "Test Spot",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid spot ID");
});

/**
 * Test that updating a spot that does not exist returns a 404 status.
 */
test("PUT for a nonexistent spot returns 404", async () => {
  const res = await putSpot("000000000000000000000000", {
    name: "Test Spot",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.error, "Spot not found");
});

/**
 * Test that updating a spot with invalid data returns a 400 status.
 */
test("PUT with invalid data returns 400", async () => {
  const res = await putSpot("000000000000000000000000", {});

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Name is required/);
  assert.match(body.error, /Building is required/);
  assert.match(body.error, /Noise level/);
});
