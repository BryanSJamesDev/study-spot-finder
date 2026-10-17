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
