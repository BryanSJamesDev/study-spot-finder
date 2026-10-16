import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClosingTime,
  getSpotTags,
  parseTags,
} from "../public/js/spotUtils.js";

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

/** Test that a missing spot returns an empty array. */
test("getSpotTags handles missing spots", () => {
  // Create test cases for missing spots
  const missingSpots = [null, undefined];

  // Loop through missing spots and check that an empty array is returned
  for (const spot of missingSpots) {
    assert.deepEqual(getSpotTags(spot), []);
  }
});

/** Test that values that look true but are not booleans are ignored. */
test("getSpotTags ignores values that are not true booleans", () => {
  // Create a spot with incorrect values for outlets and Wi-Fi
  const spot = {
    outlets: "yes",
    wifi: 1,
  };

  // Check that invalid boolean values do not return tags
  assert.deepEqual(getSpotTags(spot), []);
});

/** Test that invalid tags are filtered out. */
test("getSpotTags filters out invalid tags", () => {
  // Create a spot with valid and invalid tags
  const spot = {
    tags: ["quiet", "", "   ", 5, null],
  };

  // Check that only valid, non-empty string tags are returned
  assert.deepEqual(getSpotTags(spot), ["quiet"]);
});

/** Test that tags that are not a list are ignored. */
test("getSpotTags ignores tags that are not an array", () => {
  // Create a spot with outlets and an invalid tags value
  const spot = {
    outlets: true,
    tags: "quiet",
  };

  // Check that the outlet tag is returned and invalid tags are ignored
  assert.deepEqual(getSpotTags(spot), ["Outlets"]);
});

/** Test that normal input is parsed into tags correctly. */
test("parseTags parses normal input", () => {
  // Create test cases with input and expected tags
  const cases = [
    ["quiet zone, outlets", ["quiet zone", "outlets"]],
    ["quiet", ["quiet"]],
  ];

  // Loop through test cases and check that tags are parsed correctly
  for (const [input, expected] of cases) {
    assert.deepEqual(parseTags(input), expected);
  }
});

/** Test that extra spaces and commas are handled correctly. */
test("parseTags handles messy input", () => {
  // Create input with extra spaces, double commas, and a trailing comma
  const input = "  quiet zone ,, outlets, ";

  // Check that empty tags are removed and spaces are trimmed
  assert.deepEqual(parseTags(input), ["quiet zone", "outlets"]);
});

/** Test that empty input returns an empty array. */
test("parseTags handles empty input", () => {
  // Create test cases for empty strings and commas
  const cases = ["", "   ", ",,,"];

  // Loop through test cases and check that an empty array is returned
  for (const input of cases) {
    assert.deepEqual(parseTags(input), []);
  }
});

/** Test that inputs with the wrong type return an empty array. */
test("parseTags handles incorrect input types", () => {
  // Create test cases for null, undefined, numbers, and arrays
  const cases = [null, undefined, 5, ["quiet"]];

  // Loop through test cases and check that an empty array is returned
  for (const input of cases) {
    assert.deepEqual(parseTags(input), []);
  }
});

/** Test that parseTags handles a large number of tags. */
test("parseTags handles 1000 tags", () => {
  // Create a string containing 1000 tags separated by commas
  const text = Array(1000).fill("tag").join(",");

  // Check that all 1000 tags are returned
  assert.equal(parseTags(text).length, 1000);
});
