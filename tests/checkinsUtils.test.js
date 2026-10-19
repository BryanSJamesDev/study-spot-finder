import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CROWD_LEVELS,
  MAX_NOTE_LENGTH,
  buildCheckinBody,
  crowdBadgeClass,
  formatCheckinCount,
  formatCheckinTime,
  formatHour,
  formatTimeAgo,
  sortCrowdedNow,
  validateCheckin,
} from "../public/js/checkinsUtils.js";

// Valid form values reused by the validation tests
const VALID = {
  spotName: "Snell Quiet Floor",
  crowdLevel: "Moderate",
  note: "",
};

test("crowdBadgeClass maps each crowd level to a badge class", () => {
  assert.equal(crowdBadgeClass("Not busy"), "status--success");
  assert.equal(crowdBadgeClass("Moderate"), "status--warning");
  assert.equal(crowdBadgeClass("Very busy"), "status--danger");
});

test("crowdBadgeClass returns an empty string for unknown levels", () => {
  assert.equal(crowdBadgeClass("Packed"), "");
  assert.equal(crowdBadgeClass(""), "");
  assert.equal(crowdBadgeClass(undefined), "");
  assert.equal(crowdBadgeClass("constructor"), "");
});

test("formatHour formats morning, noon, afternoon and midnight", () => {
  assert.equal(formatHour(0), "12 AM");
  assert.equal(formatHour(9), "9 AM");
  assert.equal(formatHour(12), "12 PM");
  assert.equal(formatHour(14), "2 PM");
  assert.equal(formatHour(23), "11 PM");
});

test("formatHour returns an empty string for invalid hours", () => {
  assert.equal(formatHour(-1), "");
  assert.equal(formatHour(24), "");
  assert.equal(formatHour(1.5), "");
  assert.equal(formatHour("14"), "");
  assert.equal(formatHour(undefined), "");
});

test("formatCheckinTime combines the day and hour", () => {
  assert.equal(
    formatCheckinTime({ day: "Sunday", hour: 14 }),
    "Sunday at 2 PM",
  );
});

test("formatCheckinTime returns an empty string when day or hour is missing", () => {
  assert.equal(formatCheckinTime({ hour: 14 }), "");
  assert.equal(formatCheckinTime({ day: "Sunday" }), "");
});

test("formatTimeAgo handles minutes, hours and days", () => {
  const now = new Date("2026-10-18T20:00:00Z").getTime();
  assert.equal(formatTimeAgo("2026-10-18T19:59:40Z", now), "just now");
  assert.equal(formatTimeAgo("2026-10-18T19:55:00Z", now), "5 min ago");
  assert.equal(formatTimeAgo("2026-10-18T19:00:00Z", now), "1 hour ago");
  assert.equal(formatTimeAgo("2026-10-18T15:00:00Z", now), "5 hours ago");
  assert.equal(formatTimeAgo("2026-10-17T19:00:00Z", now), "1 day ago");
  assert.equal(formatTimeAgo("2026-10-15T20:00:00Z", now), "3 days ago");
});

test("formatTimeAgo treats a future timestamp as just now", () => {
  const now = new Date("2026-10-18T20:00:00Z").getTime();
  assert.equal(formatTimeAgo("2026-10-18T20:05:00Z", now), "just now");
});

test("formatTimeAgo returns an empty string for an invalid timestamp", () => {
  assert.equal(formatTimeAgo("not a date"), "");
});

test("formatCheckinCount uses the right plural", () => {
  assert.equal(formatCheckinCount(0), "0 check-ins");
  assert.equal(formatCheckinCount(1), "1 check-in");
  assert.equal(formatCheckinCount(3), "3 check-ins");
});

test("sortCrowdedNow puts the busiest spots first and breaks ties by name", () => {
  const rows = [
    { spotName: "B Spot", average: 1 },
    { spotName: "C Spot", average: 3 },
    { spotName: "A Spot", average: 1 },
  ];
  const sorted = sortCrowdedNow(rows);
  assert.deepEqual(
    sorted.map((row) => row.spotName),
    ["C Spot", "A Spot", "B Spot"],
  );
});

test("sortCrowdedNow does not change the original array", () => {
  const rows = [
    { spotName: "B Spot", average: 1 },
    { spotName: "A Spot", average: 2 },
  ];
  sortCrowdedNow(rows);
  assert.equal(rows[0].spotName, "B Spot");
});

test("validateCheckin accepts valid values", () => {
  assert.deepEqual(validateCheckin(VALID), []);
  assert.deepEqual(validateCheckin({ ...VALID, note: "lots of outlets" }), []);
});

test("validateCheckin accepts every crowd level", () => {
  for (const crowdLevel of CROWD_LEVELS) {
    assert.deepEqual(validateCheckin({ ...VALID, crowdLevel }), []);
  }
});

test("validateCheckin requires a spot and a crowd level", () => {
  const errors = validateCheckin({ spotName: "", crowdLevel: "", note: "" });
  assert.equal(errors.length, 2);
});

test("validateCheckin rejects an unknown crowd level", () => {
  assert.equal(validateCheckin({ ...VALID, crowdLevel: "Packed" }).length, 1);
});

test("validateCheckin enforces the note length after trimming", () => {
  const atLimit = "a".repeat(MAX_NOTE_LENGTH);
  assert.deepEqual(validateCheckin({ ...VALID, note: atLimit }), []);
  assert.deepEqual(validateCheckin({ ...VALID, note: `  ${atLimit}  ` }), []);
  assert.equal(validateCheckin({ ...VALID, note: `${atLimit}a` }).length, 1);
});

test("buildCheckinBody trims the note", () => {
  assert.deepEqual(buildCheckinBody({ ...VALID, note: "  quiet today  " }), {
    spotName: "Snell Quiet Floor",
    crowdLevel: "Moderate",
    note: "quiet today",
  });
});

test("buildCheckinBody sends an empty string when there is no note", () => {
  assert.equal(buildCheckinBody({ ...VALID, note: undefined }).note, "");
});
