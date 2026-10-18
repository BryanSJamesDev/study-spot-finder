import test from "node:test";
import assert from "node:assert/strict";
import {
  CROWD_LEVELS,
  crowdToScore,
  scoreToCrowd,
  getCampusDayAndHour,
} from "../ml/crowd.js";

/** Test the crowd levels are in order from least to most busy. */
test("crowd levels are ordered from least to most busy", () => {
  assert.deepEqual(CROWD_LEVELS, ["Not busy", "Moderate", "Very busy"]);
});

/** Test each crowd level turns into the right score. */
test("crowdToScore turns each level into 1, 2, or 3", () => {
  assert.equal(crowdToScore("Not busy"), 1);
  assert.equal(crowdToScore("Moderate"), 2);
  assert.equal(crowdToScore("Very busy"), 3);
});

/** Test unknown crowd levels return null. */
test("crowdToScore returns null for unknown levels", () => {
  assert.equal(crowdToScore("busy"), null);
  assert.equal(crowdToScore(2), null);
  assert.equal(crowdToScore(undefined), null);
});

/** Test scores turn into the closest crowd level. */
test("scoreToCrowd rounds to the closest level", () => {
  assert.equal(scoreToCrowd(1), "Not busy");
  assert.equal(scoreToCrowd(1.4), "Not busy");
  assert.equal(scoreToCrowd(1.5), "Moderate");
  assert.equal(scoreToCrowd(2.4), "Moderate");
  assert.equal(scoreToCrowd(2.5), "Very busy");
  assert.equal(scoreToCrowd(3), "Very busy");
});

/** Test scores outside the range stay on the nearest level. */
test("scoreToCrowd clamps scores outside 1 to 3", () => {
  assert.equal(scoreToCrowd(0), "Not busy");
  assert.equal(scoreToCrowd(-5), "Not busy");
  assert.equal(scoreToCrowd(7), "Very busy");
});

/** Test the campus day and hour during daylight saving time (UTC-4). */
test("getCampusDayAndHour uses campus time in October", () => {
  assert.deepEqual(getCampusDayAndHour(new Date("2026-10-17T07:00:00Z")), {
    day: "Saturday",
    hour: 3,
  });
  assert.deepEqual(getCampusDayAndHour(new Date("2026-10-18T03:30:00Z")), {
    day: "Saturday",
    hour: 23,
  });
});

/** Test midnight is hour 0 and starts the next day. */
test("getCampusDayAndHour treats midnight as hour 0", () => {
  assert.deepEqual(getCampusDayAndHour(new Date("2026-10-18T04:00:00Z")), {
    day: "Sunday",
    hour: 0,
  });
});

/** Test the campus day and hour during standard time (UTC-5). */
test("getCampusDayAndHour uses campus time in December", () => {
  assert.deepEqual(getCampusDayAndHour(new Date("2026-12-07T17:00:00Z")), {
    day: "Monday",
    hour: 12,
  });
});
