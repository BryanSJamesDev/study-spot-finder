import test from "node:test";
import assert from "node:assert/strict";
import { formatClosingTime } from "../public/js/spotUtils.js";

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
