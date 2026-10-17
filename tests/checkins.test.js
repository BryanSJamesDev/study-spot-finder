import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { ObjectId } from "mongodb";
import checkinsRouter from "../routes/checkins.js";
import { connectDB, getDB, closeDB } from "../db.js";

const server = express();
let baseUrl;

server.use(express.json());
server.use("/api/checkins", checkinsRouter);

let listener;

/** Start the server before running tests */
before(async () => {
  await connectDB();
  listener = await new Promise((resolve) => {
    const serverInstance = server.listen(0, () => {
      resolve(serverInstance);
    });
  });
  baseUrl = `http://localhost:${listener.address().port}/api/checkins`;
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
// Helper function that returns a valid check-in, with optional changes
function validCheckin(changes = {}) {
  return {
    spotName: "Test Spot",
    crowdLevel: "Moderate",
    day: "Tuesday",
    hour: 15,
    ...changes,
  };
}

// Helper function to send POST requests with check-in data
function postCheckin(data) {
  return fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper function to send PUT requests with check-in data
function putCheckin(id, data) {
  return fetch(`${baseUrl}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper function to send DELETE requests for a check-in
function deleteCheckin(id) {
  return fetch(`${baseUrl}/${id}`, { method: "DELETE" });
}

// Helper function to remove a test check-in from the database
async function removeCheckin(id) {
  if (id) {
    await getDB()
      .collection("checkins")
      .deleteOne({ _id: new ObjectId(id) });
  }
}

/** Test an invalid check-in ID returns a 400 status code. */
test("invalid check-in ID returns 400", async () => {
  const res = await fetch(`${baseUrl}/hello`);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid check-in ID");
});

/** Test a 12-character invalid check-in ID returns a 400 status code. */
test("12-character check-in ID returns 400", async () => {
  const res = await fetch(`${baseUrl}/hello%20world!`);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid check-in ID");
});

/** Test a valid check-in ID that does not exist returns a 404 status code. */
test("nonexistent check-in ID returns 404", async () => {
  const res = await fetch(`${baseUrl}/000000000000000000000000`);

  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.error, "Check-in not found");
});

/** Test GET /api/checkins returns a list of check-ins. */
test("GET /api/checkins returns a list", async () => {
  const res = await fetch(baseUrl);

  assert.equal(res.status, 200);

  const body = await res.json();
  assert.ok(Array.isArray(body));
});

/** Test GET /api/checkins/:id returns the check-in when it exists. */
test("GET /api/checkins/:id returns the check-in", async () => {
  const { insertedId } = await getDB()
    .collection("checkins")
    .insertOne(validCheckin({ spotName: "Test Spot for GET" }));

  try {
    const res = await fetch(`${baseUrl}/${insertedId}`);

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.spotName, "Test Spot for GET");
    assert.equal(body.crowdLevel, "Moderate");
  } finally {
    await getDB().collection("checkins").deleteOne({ _id: insertedId });
  }
});

/** Test GET /api/checkins?spotName= only returns check-ins for that spot. */
test("GET with spotName filter returns only that spot", async () => {
  const { insertedIds } = await getDB()
    .collection("checkins")
    .insertMany([
      validCheckin({ spotName: "Test Spot for Filter" }),
      validCheckin({ spotName: "Test Spot for Other Filter" }),
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
      .collection("checkins")
      .deleteMany({ _id: { $in: ids } });
  }
});

/** Test GET /api/checkins?limit= returns the newest check-ins first. */
test("GET with limit returns only the newest check-ins", async () => {
  const now = Date.now();
  const { insertedIds } = await getDB()
    .collection("checkins")
    .insertMany([
      validCheckin({
        spotName: "Test Spot for Limit",
        hour: 8,
        createdAt: new Date(now - 3000),
      }),
      validCheckin({
        spotName: "Test Spot for Limit",
        hour: 9,
        createdAt: new Date(now - 2000),
      }),
      validCheckin({
        spotName: "Test Spot for Limit",
        hour: 10,
        createdAt: new Date(now - 1000),
      }),
    ]);
  const ids = Object.values(insertedIds);

  try {
    const res = await fetch(
      `${baseUrl}?spotName=${encodeURIComponent("Test Spot for Limit")}&limit=2`,
    );

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.length, 2);
    assert.equal(body[0].hour, 10);
    assert.equal(body[1].hour, 9);
  } finally {
    await getDB()
      .collection("checkins")
      .deleteMany({ _id: { $in: ids } });
  }
});

/** Test crowded-now averages the last 2 hours and ignores older check-ins. */
test("GET /api/checkins/crowded-now averages recent check-ins", async () => {
  const { insertedIds } = await getDB()
    .collection("checkins")
    .insertMany([
      validCheckin({
        spotName: "Test Spot for Crowded Now",
        crowdLevel: "Not busy",
        createdAt: new Date(),
      }),
      validCheckin({
        spotName: "Test Spot for Crowded Now",
        crowdLevel: "Very busy",
        createdAt: new Date(),
      }),
      validCheckin({
        spotName: "Test Spot for Crowded Now",
        crowdLevel: "Very busy",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      }),
    ]);
  const ids = Object.values(insertedIds);

  try {
    const res = await fetch(
      `${baseUrl}/crowded-now?spotName=${encodeURIComponent("Test Spot for Crowded Now")}`,
    );

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].spotName, "Test Spot for Crowded Now");
    assert.equal(body[0].crowdLevel, "Moderate");
    assert.equal(body[0].average, 2);
    assert.equal(body[0].count, 2);
  } finally {
    await getDB()
      .collection("checkins")
      .deleteMany({ _id: { $in: ids } });
  }
});

/** Test crowded-now returns an empty list when a spot has no recent check-ins. */
test("crowded-now returns an empty list with no recent check-ins", async () => {
  const res = await fetch(
    `${baseUrl}/crowded-now?spotName=${encodeURIComponent("Test Spot Nobody Visited")}`,
  );

  assert.equal(res.status, 200);

  const body = await res.json();
  assert.deepEqual(body, []);
});

/** Test a valid check-in returns 201, trims extra spaces, and adds createdAt. */
test("valid check-in returns 201", async () => {
  const res = await postCheckin(
    validCheckin({ spotName: "  Test Spot for POST  " }),
  );
  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.ok(body._id);
    assert.equal(body.spotName, "Test Spot for POST");
    assert.equal(body.crowdLevel, "Moderate");
    assert.equal(body.day, "Tuesday");
    assert.equal(body.hour, 15);
    assert.equal(body.note, null);
    assert.ok(body.createdAt);
  } finally {
    await removeCheckin(body._id);
  }
});

/** Test a note is trimmed and saved. */
test("note is trimmed and saved", async () => {
  const res = await postCheckin(
    validCheckin({
      spotName: "Test Spot for Note",
      note: "  line out the door  ",
    }),
  );
  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.equal(body.note, "line out the door");
  } finally {
    await removeCheckin(body._id);
  }
});

/** Test the earliest and latest hours are accepted. */
test("hour 0 and hour 23 are both accepted", async () => {
  const created = [];

  try {
    for (const hour of [0, 23]) {
      const res = await postCheckin(
        validCheckin({ spotName: "Test Spot for Hour Limits", hour }),
      );
      const body = await res.json();
      created.push(body._id);

      assert.equal(res.status, 201);
      assert.equal(body.hour, hour);
    }
  } finally {
    for (const id of created) {
      await removeCheckin(id);
    }
  }
});

/** Test a missing spot name returns a 400 status code. */
test("missing spot name returns 400", async () => {
  const data = validCheckin();
  delete data.spotName;
  const res = await postCheckin(data);

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
});

/** Test a spot name containing only spaces returns a 400 status code. */
test("spot name with only spaces returns 400", async () => {
  const res = await postCheckin(validCheckin({ spotName: "   " }));

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
});

/** Test a spot name with the wrong type returns a 400 status code. */
test("spot name with the wrong type returns 400", async () => {
  const res = await postCheckin(validCheckin({ spotName: 123 }));

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
});

/** Test invalid crowd levels return a 400 status code. */
test("invalid crowd levels return 400", async () => {
  for (const crowdLevel of ["busy", "not busy", 2, null]) {
    const res = await postCheckin(validCheckin({ crowdLevel }));

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Crowd level/);
  }
});

/** Test invalid days return a 400 status code. */
test("invalid days return 400", async () => {
  for (const day of ["Funday", "monday", 3, null]) {
    const res = await postCheckin(validCheckin({ day }));

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Day must be a day of the week/);
  }
});

/** Test invalid hours return a 400 status code. */
test("invalid hours return 400", async () => {
  for (const hour of [-1, 24, 3.5, "15", null]) {
    const res = await postCheckin(validCheckin({ hour }));

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Hour must be a whole number from 0 to 23/);
  }
});

/** Test invalid notes return a 400 status code. */
test("invalid notes return 400", async () => {
  for (const note of [5, null, "a".repeat(201)]) {
    const res = await postCheckin(validCheckin({ note }));

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Note must be text/);
  }
});

/** Test an empty body returns all validation errors. */
test("empty body returns all validation errors", async () => {
  const res = await postCheckin({});

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
  assert.match(body.error, /Crowd level/);
  assert.match(body.error, /Day must be a day of the week/);
  assert.match(body.error, /Hour must be a whole number from 0 to 23/);
});

/** Test that updating a check-in saves the changes and keeps createdAt. */
test("updating a check-in saves the changes", async () => {
  const res = await postCheckin(
    validCheckin({ spotName: "Test Spot for Update" }),
  );
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const updateRes = await putCheckin(
      created._id,
      validCheckin({
        spotName: "Test Spot for Update",
        crowdLevel: "Very busy",
        hour: 16,
        note: "no seats left",
      }),
    );

    assert.equal(updateRes.status, 200);

    const body = await updateRes.json();
    assert.equal(body.crowdLevel, "Very busy");
    assert.equal(body.hour, 16);

    // Check that the changes were saved in the database.
    const getRes = await fetch(`${baseUrl}/${created._id}`);
    const saved = await getRes.json();

    assert.equal(getRes.status, 200);
    assert.equal(saved.crowdLevel, "Very busy");
    assert.equal(saved.note, "no seats left");
    assert.ok(saved.createdAt);
  } finally {
    await removeCheckin(created._id);
  }
});

/** Test that updating a check-in with an invalid ID returns a 400 status. */
test("PUT with invalid ID returns 400", async () => {
  const res = await putCheckin("hello", validCheckin());

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid check-in ID");
});

/** Test that updating a check-in that does not exist returns a 404 status. */
test("PUT for a nonexistent check-in returns 404", async () => {
  const res = await putCheckin("000000000000000000000000", validCheckin());

  assert.equal(res.status, 404);

  const body = await res.json();
  assert.equal(body.error, "Check-in not found");
});

/** Test that updating a check-in with invalid data returns a 400 status. */
test("PUT with invalid data returns 400", async () => {
  const res = await putCheckin("000000000000000000000000", {});

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.match(body.error, /Spot name is required/);
  assert.match(body.error, /Crowd level/);
  assert.match(body.error, /Day must be a day of the week/);
  assert.match(body.error, /Hour must be a whole number from 0 to 23/);
});

/** Test that deleting a check-in returns 204 and removes it from the database. */
test("deleting a check-in returns 204 and removes it", async () => {
  const res = await postCheckin(
    validCheckin({ spotName: "Test Spot for Delete" }),
  );
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const deleteRes = await deleteCheckin(created._id);
    assert.equal(deleteRes.status, 204);

    const getRes = await fetch(`${baseUrl}/${created._id}`);
    assert.equal(getRes.status, 404);
  } finally {
    await removeCheckin(created._id);
  }
});

/** Test that deleting a check-in twice returns 404 on the second attempt. */
test("deleting a check-in twice returns 404 the second time", async () => {
  const res = await postCheckin(
    validCheckin({ spotName: "Test Spot for Double Delete" }),
  );
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const firstDelete = await deleteCheckin(created._id);
    assert.equal(firstDelete.status, 204);

    const secondDelete = await deleteCheckin(created._id);
    assert.equal(secondDelete.status, 404);

    const body = await secondDelete.json();
    assert.equal(body.error, "Check-in not found");
  } finally {
    await removeCheckin(created._id);
  }
});

/** Test that deleting with an invalid ID returns a 400 status. */
test("DELETE with invalid ID returns 400", async () => {
  const res = await deleteCheckin("hello");

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid check-in ID");
});

/** Test that GET all returns a 500 status when the database fails. */
test("GET all returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(baseUrl);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load check-ins");
  } finally {
    await connectDB();
  }
});

/** Test that crowded-now returns a 500 status when the database fails. */
test("crowded-now returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(`${baseUrl}/crowded-now`);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load crowd levels");
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
    assert.equal(body.error, "Failed to load check-in");
  } finally {
    await connectDB();
  }
});

/** Test that POST returns a 500 status when the database fails. */
test("POST returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await postCheckin(
      validCheckin({ spotName: "Test Spot for Database Failure" }),
    );

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to create check-in");
  } finally {
    await connectDB();
  }
});

/** Test that PUT returns a 500 status when the database fails. */
test("PUT returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await putCheckin("000000000000000000000000", validCheckin());

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to update check-in");
  } finally {
    await connectDB();
  }
});

/** Test that DELETE returns a 500 status when the database fails. */
test("DELETE returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await deleteCheckin("000000000000000000000000");

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to delete check-in");
  } finally {
    await connectDB();
  }
});
