import test from "node:test";
import assert from "node:assert/strict";
import { SEED_SPOTS } from "../seed/spotsData.js";

/** Test that there are at least 20 seed spots. */
test("SEED_SPOTS contains at least 20 spots", () => {
  assert.ok(SEED_SPOTS.length >= 20);
});

/** Test that every spot has a name and building. */
test("every spot has a name and building", () => {
  // Check that each spot has a non-empty name and building
  for (const spot of SEED_SPOTS) {
    assert.equal(typeof spot.name, "string", "A spot has no name");
    assert.ok(spot.name.trim() !== "", "A spot is missing a name");

    assert.equal(
      typeof spot.building,
      "string",
      `${spot.name} has no building`,
    );
    assert.ok(
      spot.building.trim() !== "",
      `${spot.name} has an empty building`,
    );
  }
});

/** Test that every spot has a valid noise level. */
test("every spot has a valid noise level", () => {
  // List the allowed noise levels
  const levels = ["Quiet", "Moderate", "Loud"];

  // Check that each spot uses one of the allowed levels
  for (const spot of SEED_SPOTS) {
    assert.ok(
      levels.includes(spot.noiseLevel),
      `${spot.name} has a bad noise level`,
    );
  }
});

/** Test that every spot has a unique name. */
test("all spot names are unique", () => {
  // Get all spot names
  const names = SEED_SPOTS.map((spot) => spot.name);

  // Check that no names are duplicated
  assert.equal(new Set(names).size, names.length);
});

/** Test that optional fields have the correct types. */
test("every spot has valid optional fields", () => {
  // Check the optional fields for each spot
  for (const spot of SEED_SPOTS) {
    assert.equal(
      typeof spot.outlets,
      "boolean",
      `${spot.name} has invalid outlets`,
    );
    assert.equal(typeof spot.wifi, "boolean", `${spot.name} has invalid wifi`);

    // Check the closing time if one is provided
    if (spot.closingTime !== undefined) {
      assert.ok(
        /^([01]\d|2[0-3]):[0-5]\d$/.test(spot.closingTime),
        `${spot.name} has an invalid closing time`,
      );
    }

    // Check that tags are an array of non-empty strings
    assert.ok(Array.isArray(spot.tags), `${spot.name} has invalid tags`);
    assert.ok(
      spot.tags.every((tag) => typeof tag === "string" && tag.trim() !== ""),
      `${spot.name} has an invalid tag`,
    );
  }
});

/** Test that every spot is located on campus. */
test("every spot has coordinates within campus boundaries", () => {
  // Set the campus coordinate boundaries
  const CAMPUS = {
    minLat: 42.333,
    maxLat: 42.344,
    minLng: -71.096,
    maxLng: -71.083,
  };

  // Check that every spot has valid coordinates within campus
  for (const spot of SEED_SPOTS) {
    assert.equal(
      typeof spot.lat,
      "number",
      `${spot.name} has an invalid latitude`,
    );
    assert.equal(
      typeof spot.lng,
      "number",
      `${spot.name} has an invalid longitude`,
    );

    assert.ok(
      spot.lat >= CAMPUS.minLat && spot.lat <= CAMPUS.maxLat,
      `${spot.name} is off campus`,
    );
    assert.ok(
      spot.lng >= CAMPUS.minLng && spot.lng <= CAMPUS.maxLng,
      `${spot.name} is off campus`,
    );
  }
});
