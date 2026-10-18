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

// Helper function to send DELETE requests with spot data
function deleteSpot(id) {
  return fetch(`${baseUrl}/${id}`, { method: "DELETE" });
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

/**
 * Test that renaming a spot to another spot's name returns a 409 status.
 */
test("renaming a spot to another spot's name returns 409", async () => {
  const resA = await postSpot({
    name: "Test Spot A",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });
  const a = await resA.json();

  const resB = await postSpot({
    name: "Test Spot B",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });
  const b = await resB.json();

  try {
    assert.equal(resA.status, 201);
    assert.equal(resB.status, 201);

    const res = await putSpot(b._id, {
      name: "Test Spot A",
      building: "Snell Library",
      noiseLevel: "Quiet",
    });

    assert.equal(res.status, 409);

    const body = await res.json();
    assert.equal(body.error, "A spot with that name already exists");
  } finally {
    if (a._id) {
      await getDB()
        .collection("spots")
        .deleteOne({
          _id: new ObjectId(a._id),
        });
    }

    if (b._id) {
      await getDB()
        .collection("spots")
        .deleteOne({
          _id: new ObjectId(b._id),
        });
    }
  }
});

/**
 * Test that PUT replaces the whole spot, resetting omitted optional fields.
 */
test("PUT replaces the whole spot", async () => {
  const res = await postSpot({
    name: "Test Spot for Replacement",
    building: "Snell Library",
    noiseLevel: "Quiet",
    tags: ["quiet zone"],
    outlets: true,
  });
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const updateRes = await putSpot(created._id, {
      name: "Test Spot for Replacement",
      building: "Snell Library",
      noiseLevel: "Moderate",
    });

    assert.equal(updateRes.status, 200);

    const body = await updateRes.json();
    assert.deepEqual(body.tags, []);
    assert.equal(body.outlets, false);
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
 * Test that deleting a spot returns 204 and removes it from the database.
 */
test("deleting a spot returns 204 and removes it", async () => {
  const res = await postSpot({
    name: "Test Spot for Delete",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const deleteRes = await deleteSpot(created._id);
    assert.equal(deleteRes.status, 204);

    const getRes = await fetch(`${baseUrl}/${created._id}`);
    assert.equal(getRes.status, 404);
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
 * Test that deleting a spot twice returns 404 on the second attempt.
 */
test("deleting a spot twice returns 404 the second time", async () => {
  const res = await postSpot({
    name: "Test Spot for Double Delete",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });
  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const firstDelete = await deleteSpot(created._id);
    assert.equal(firstDelete.status, 204);

    const secondDelete = await deleteSpot(created._id);
    assert.equal(secondDelete.status, 404);

    const body = await secondDelete.json();
    assert.equal(body.error, "Spot not found");
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
 * Test that deleting with an invalid ID returns a 400 status.
 */
test("DELETE with invalid ID returns 400", async () => {
  const res = await deleteSpot("hello");

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error, "Invalid spot ID");
});

/**
 * Test that GET one returns a 500 status when the database fails.
 */
test("GET one returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(`${baseUrl}/000000000000000000000000`);

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load spot");
  } finally {
    await connectDB();
  }
});

/**
 * Test that POST returns a 500 status when the database fails.
 */
test("POST returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await postSpot({
      name: "Test Spot for Database Failure",
      building: "Snell Library",
      noiseLevel: "Quiet",
    });

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to create spot");
  } finally {
    await connectDB();
  }
});

/**
 * Test that PUT returns a 500 status when the database fails.
 */
test("PUT returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await putSpot("000000000000000000000000", {
      name: "Test Spot",
      building: "Snell Library",
      noiseLevel: "Quiet",
    });

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to update spot");
  } finally {
    await connectDB();
  }
});

/**
 * Test that DELETE returns a 500 status when the database fails.
 */
test("DELETE returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await deleteSpot("000000000000000000000000");

    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to delete spot");
  } finally {
    await connectDB();
  }
});

/**
 * Test that a valid location is saved correctly.
 */
test("valid location is saved", async () => {
  const res = await postSpot({
    name: "Test Spot for Location",
    building: "Snell Library",
    noiseLevel: "Quiet",
    lat: 42.3381,
    lng: -71.0878,
  });

  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.equal(body.lat, 42.3381);
    assert.equal(body.lng, -71.0878);
  } finally {
    if (body._id) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(body._id) });
    }
  }
});

/**
 * Test that a missing location saves as null.
 */
test("missing location saves as null", async () => {
  const res = await postSpot({
    name: "Test Spot for Missing Location",
    building: "Snell Library",
    noiseLevel: "Quiet",
  });

  const body = await res.json();

  try {
    assert.equal(res.status, 201);
    assert.equal(body.lat, null);
    assert.equal(body.lng, null);
  } finally {
    if (body._id) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(body._id) });
    }
  }
});

/**
 * Test that providing only half a location returns a 400 status.
 */
test("half a location returns 400", async () => {
  for (const location of [
    { lat: 42.3381 },
    { lng: -71.0878 },
    { lat: 42.3381, lng: null },
  ]) {
    const res = await postSpot({
      name: "Test Spot",
      building: "Snell Library",
      noiseLevel: "Quiet",
      ...location,
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Location needs both latitude and longitude/);
  }
});

/**
 * Test that off-campus and wrong-type locations return a 400 status.
 */
test("invalid locations return 400", async () => {
  for (const location of [
    { lat: 40.7128, lng: -74.006 },
    { lat: 42.3329, lng: -71.0878 },
    { lat: 42.3381, lng: -71.0969 },
    { lat: "42.3381", lng: "-71.0878" },
    { lat: true, lng: false },
  ]) {
    const res = await postSpot({
      name: "Test Spot",
      building: "Snell Library",
      noiseLevel: "Quiet",
      ...location,
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.error, /Location must be on Northeastern's campus/);
  }
});

/**
 * Test that locations on the exact campus boundaries are accepted.
 */
test("exact campus boundaries are accepted", async () => {
  const locations = [
    { lat: 42.333, lng: -71.096 },
    { lat: 42.344, lng: -71.083 },
  ];
  const createdIds = [];

  try {
    for (let i = 0; i < locations.length; i++) {
      const res = await postSpot({
        name: `Test Spot for Edge ${i}`,
        building: "Snell Library",
        noiseLevel: "Quiet",
        ...locations[i],
      });

      const body = await res.json();

      assert.equal(res.status, 201);
      createdIds.push(body._id);
    }
  } finally {
    for (const id of createdIds) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(id) });
    }
  }
});

/**
 * Test that PUT updates a spot's location.
 */
test("PUT updates the location", async () => {
  const res = await postSpot({
    name: "Test Spot for Location Update",
    building: "Snell Library",
    noiseLevel: "Quiet",
    lat: 42.3381,
    lng: -71.0878,
  });

  const created = await res.json();

  try {
    assert.equal(res.status, 201);

    const updateRes = await putSpot(created._id, {
      name: "Test Spot for Location Update",
      building: "Snell Library",
      noiseLevel: "Quiet",
      lat: 42.339,
      lng: -71.089,
    });

    assert.equal(updateRes.status, 200);

    const body = await updateRes.json();

    assert.equal(body.lat, 42.339);
    assert.equal(body.lng, -71.089);
  } finally {
    if (created._id) {
      await getDB()
        .collection("spots")
        .deleteOne({ _id: new ObjectId(created._id) });
    }
  }
});

/** Test that similar spots returns the closest match first. */
test("similar spots returns the closest match first", async () => {
  const targetRes = await postSpot({
    name: "Test KNN Target",
    building: "Snell Library",
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["test knn unique tag"],
  });
  const target = await targetRes.json();

  const twinRes = await postSpot({
    name: "Test KNN Twin",
    building: "Snell Library",
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["test knn unique tag"],
  });
  const twin = await twinRes.json();

  try {
    assert.equal(targetRes.status, 201);
    assert.equal(twinRes.status, 201);

    const res = await fetch(`${baseUrl}/${target._id}/similar`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.ok(body.length <= 3);

    // The identical twin should be the closest match
    assert.equal(body[0].spot.name, "Test KNN Twin");
    assert.equal(body[0].distance, 0);

    // A spot should never recommend itself
    assert.ok(body.every((match) => match.spot.name !== "Test KNN Target"));
  } finally {
    for (const spot of [target, twin]) {
      if (spot._id) {
        await getDB()
          .collection("spots")
          .deleteOne({ _id: new ObjectId(spot._id) });
      }
    }
  }
});

/** Test that similar spots handles invalid and missing IDs. */
test("similar spots handles bad IDs", async () => {
  const invalidRes = await fetch(`${baseUrl}/hello/similar`);
  assert.equal(invalidRes.status, 400);
  const invalidBody = await invalidRes.json();
  assert.equal(invalidBody.error, "Invalid spot ID");

  const missingRes = await fetch(`${baseUrl}/000000000000000000000000/similar`);
  assert.equal(missingRes.status, 404);
  const missingBody = await missingRes.json();
  assert.equal(missingBody.error, "Spot not found");
});

/** Test that similar spots returns a 500 status when the database fails. */
test("similar spots returns 500 when the database fails", async () => {
  await closeDB();

  try {
    const res = await fetch(`${baseUrl}/000000000000000000000000/similar`);
    assert.equal(res.status, 500);

    const body = await res.json();
    assert.equal(body.error, "Failed to load similar spots");
  } finally {
    await connectDB();
  }
});
