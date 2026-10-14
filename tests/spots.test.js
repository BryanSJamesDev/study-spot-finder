import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import spotsRouter from "../routes/spots.js";
import { connectDB, closeDB } from "../db.js";

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
