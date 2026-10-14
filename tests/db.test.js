import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { connectDB, getDB, closeDB } from "../db.js";

/** Test getDB throws an error before connecting. */
test("getDB throws before connecting", () => {
  assert.throws(() => getDB(), /not connected/);
});

/** Test connectDB connects to the correct database. */
test("connectDB connects to the right database", async () => {
  await connectDB();
  assert.equal(getDB().databaseName, "studySpotFinder");
});

/** Test getDB returns the same object every time. */
test("getDB returns the same object every time", () => {
  const first = getDB();
  const second = getDB();

  assert.strictEqual(first, second);
});

/** Test the connection is working properly. */
test("the connection actually works", async () => {
  const result = await getDB().command({ ping: 1 });

  assert.equal(result.ok, 1);
});

/** Test calling connectDB twice does not break anything. */
test("connectDB can be called twice without errors", async () => {
  await assert.doesNotReject(connectDB());
});

/** Test getDB throws after closing. */
test("getDB throws after closing", async () => {
  await closeDB();
  assert.throws(() => getDB(), /not connected/);
});

/** Test calling closeDB twice does not throw an error. */
test("closeDB can be called twice without errors", async () => {
  await assert.doesNotReject(closeDB());
});

/** Test that a missing MONGO_URI throws an error. */
test("missing MONGO_URI throws a clear error", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./db.js')"],
    {
      env: { ...process.env, MONGO_URI: "" },
      encoding: "utf8",
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MONGO_URI is missing/);
});

/** Test that a malformed MONGO_URI fails. */
test("malformed MONGO_URI fails", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./db.js')"],
    {
      env: { ...process.env, MONGO_URI: "not-a-real-uri" },
      encoding: "utf8",
    },
  );

  assert.notEqual(result.status, 0);
});

/** Test that connectDB fails when the server is unreachable. */
test("connectDB fails when the server is unreachable", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "const { connectDB } = await import('./db.js'); await connectDB();",
    ],
    {
      env: {
        ...process.env,
        MONGO_URI: "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500",
      },
      encoding: "utf8",
    },
  );

  assert.notEqual(result.status, 0);
});
