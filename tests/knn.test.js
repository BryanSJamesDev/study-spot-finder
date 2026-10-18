import test from "node:test";
import assert from "node:assert/strict";
import { tagSimilarity, spotDistance } from "../ml/knn.js";

/**
 * Test that tag similarity returns the expected scores.
 */
test("tag similarity returns correct scores for normal cases", () => {
  const cases = [
    [["quiet zone"], ["quiet zone"], 1],
    [["quiet zone"], ["natural light"], 0],
    [["quiet zone", "outlets"], ["quiet zone", "natural light"], 1 / 3],
  ];

  for (const [tagsA, tagsB, expected] of cases) {
    assert.equal(tagSimilarity(tagsA, tagsB), expected);
  }
});

/**
 * Test that case, spaces, and duplicate tags are ignored.
 */
test("tag similarity ignores case, spaces, and duplicates", () => {
  const tagsA = ["Quiet Zone", "  quiet zone  ", "quiet zone"];
  const tagsB = ["QUIET ZONE"];

  assert.equal(tagSimilarity(tagsA, tagsB), 1);
});

/**
 * Test that empty or missing tags return 0.
 */
test("empty and missing tags return 0", () => {
  const cases = [
    [[], []],
    [null, ["quiet"]],
    [undefined, undefined],
    ["quiet", ["quiet"]],
  ];

  for (const [tagsA, tagsB] of cases) {
    assert.equal(tagSimilarity(tagsA, tagsB), 0);
  }
});

/**
 * Test that invalid items in a tag list are skipped.
 */
test("bad items in tag lists are skipped", () => {
  const tagsA = ["quiet", "", "   ", 5, null];
  const tagsB = ["quiet"];

  assert.equal(tagSimilarity(tagsA, tagsB), 1);
});

/**
 * Test that tag similarity works with large lists.
 */
test("tag similarity works with large lists", () => {
  const tagsA = Array.from({ length: 1000 }, (_, i) => `tag ${i}`);
  const tagsB = Array.from({ length: 1000 }, (_, i) => `tag ${i + 500}`);

  assert.equal(tagSimilarity(tagsA, tagsB), 500 / 1500);
});

/**
 * Test that identical spots have a distance of 0.
 */
test("identical spots have distance 0", () => {
  const spot = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  };

  assert.equal(spotDistance(spot, { ...spot }), 0);
});

/**
 * Test that one different feature gives a distance of 1.
 */
test("one different feature gives distance 1", () => {
  const spot = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  };

  const differentNoise = { ...spot, noiseLevel: "Loud" };
  const differentOutlets = { ...spot, outlets: false };
  const differentTags = { ...spot, tags: ["natural light"] };

  assert.equal(spotDistance(spot, differentNoise), 1);
  assert.equal(spotDistance(spot, differentOutlets), 1);
  assert.equal(spotDistance(spot, differentTags), 1);
});

/**
 * Test that spot distance is the same in either order.
 */
test("spot distance is symmetric", () => {
  const a = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: false,
    tags: ["quiet zone", "outlets"],
  };

  const b = {
    noiseLevel: "Loud",
    outlets: false,
    wifi: true,
    tags: ["natural light"],
  };

  const distanceAB = spotDistance(a, b);
  const distanceBA = spotDistance(b, a);

  assert.ok(Math.abs(distanceAB - distanceBA) < 0.0001);
});

/**
 * Test that two spots without tags still have distance 0 if otherwise identical.
 */
test("identical spots with empty tags have distance 0", () => {
  const a = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: [],
  };

  const b = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: [],
  };

  assert.equal(spotDistance(a, b), 0);
});

/**
 * Test that missing and broken spot inputs are handled correctly.
 */
test("missing and broken inputs are handled correctly", () => {
  const spot = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  };

  assert.equal(spotDistance(null, spot), Infinity);
  assert.equal(spotDistance(spot, undefined), Infinity);
  assert.equal(spotDistance({}, {}), 0);

  assert.equal(
    spotDistance({ noiseLevel: "Silent" }, { noiseLevel: "Moderate" }),
    0,
  );
});
