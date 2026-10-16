import test from "node:test";
import assert from "node:assert/strict";
import { formatClosingTime, getSpotTags } from "../public/js/spotUtils.js";

/** Test that normal times format correctly. */
test("formatClosingTime formats normal times", () => {
  // Create test cases
  const cases = [
    ["23:00", "11:00 PM"],
    ["09:30", "9:30 AM"],
    ["13:05", "1:05 PM"],
  ];

  // Loop through test cases and check formatting is proper HH:MM AM/PM
  for (const [input, expected] of cases) {
    assert.equal(formatClosingTime(input), expected);
  }
});

/** Test that boundary times format correctly. */
test("formatClosingTime formats boundary times", () => {
  // Create test cases for midnight, noon, and the end of the day
  const boundaryCases = [
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
    ["11:59", "11:59 AM"],
    ["23:59", "11:59 PM"],
  ];

  // Loop through boundary cases and check the time formatting
  for (const [input, expected] of boundaryCases) {
    assert.equal(formatClosingTime(input), expected);
  }
});

/** Test that missing input returns Hours unknown. */
test("formatClosingTime handles missing input", () => {
  // Create test cases for missing inputs
  const missingCases = [null, undefined, ""];

  // Loop through missing inputs and check that hours are reported as unknown
  for (const input of missingCases) {
    assert.equal(formatClosingTime(input), "Hours unknown");
  }
});

/** Test that inputs with the wrong type return Hours unknown. */
test("formatClosingTime handles incorrect input types", () => {
  // Create test cases for numbers, booleans, objects, and arrays
  const invalidTypes = [2300, true, {}, ["23:00"]];

  // Loop through invalid types and check that hours are reported as unknown
  for (const input of invalidTypes) {
    assert.equal(formatClosingTime(input), "Hours unknown");
  }
});

/** Test that invalid time formats return Hours unknown. */
test("formatClosingTime handles invalid time formats", () => {
  // Create test cases for invalid times and formats
  const invalidCases = [
    "24:00",
    "12:60",
    "9:00",
    "10pm",
    " 10:00",
    "9".repeat(10000),
  ];

  // Loop through invalid cases and check that hours are reported as unknown
  for (const input of invalidCases) {
    assert.equal(formatClosingTime(input), "Hours unknown");
  }
});

/** Test that a spot with all tags returns them in the correct order. */
test("getSpotTags returns all tags in the correct order", () => {
  // Create a spot with outlets, Wi-Fi, and a custom tag
  const spot = {
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  };

  // Check that all tags are returned in the correct order
  assert.deepEqual(getSpotTags(spot), ["Outlets", "Wi-Fi", "quiet zone"]);
});

/** Test that a spot with no tags returns an empty array. */
test("getSpotTags returns an empty array when a spot has no tags", () => {
  // Create a spot without outlets, Wi-Fi, or custom tags
  const spot = {
    outlets: false,
    wifi: false,
    tags: [],
  };

  // Check that no tags are returned
  assert.deepEqual(getSpotTags(spot), []);
});
