import test from "node:test";
import assert from "node:assert/strict";
import {
  tagSimilarity,
  spotDistance,
  explainMatch,
  findSimilarSpots,
} from "../ml/knn.js";

// Sample spots for findSimilarSpots tests
const knnSpots = [
  {
    name: "Quiet A",
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  },
  {
    name: "Quiet B",
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  },
  {
    name: "Quiet C",
    noiseLevel: "Quiet",
    outlets: false,
    wifi: true,
    tags: ["quiet zone"],
  },
  {
    name: "Loud D",
    noiseLevel: "Loud",
    outlets: false,
    wifi: false,
    tags: ["group study"],
  },
  {
    name: "Moderate E",
    noiseLevel: "Moderate",
    outlets: true,
    wifi: true,
    tags: ["natural light"],
  },
];

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

/**
 * Test that matching features return reasons in the correct order.
 */
test("everything matches", () => {
  const a = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone", "outlets"],
  };

  const b = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone", "outlets"],
  };

  assert.deepEqual(explainMatch(a, b), [
    "Same noise level",
    "Both have outlets",
    "Both have Wi-Fi",
    "2 shared tags",
  ]);
});

/**
 * Test that one shared tag uses the singular form and ignores capitalization.
 */
test("one shared tag uses the singular", () => {
  const a = { tags: ["quiet zone", "cozy"] };
  const b = { tags: ["Quiet Zone", "spacious"] };

  assert.deepEqual(explainMatch(a, b), ["1 shared tag"]);
});

/**
 * Test that spots with nothing in common return an empty list.
 */
test("nothing in common returns an empty list", () => {
  const a = {
    noiseLevel: "Quiet",
    outlets: true,
    tags: ["quiet zone"],
  };

  const b = {
    noiseLevel: "Loud",
    wifi: true,
    tags: ["group study"],
  };

  assert.deepEqual(explainMatch(a, b), []);
});

/**
 * Test that features both spots lack do not count as matching reasons.
 */
test("features both spots lack do not count", () => {
  const a = { outlets: false, wifi: false };
  const b = { outlets: false, wifi: false };

  assert.deepEqual(explainMatch(a, b), []);
});

/**
 * Test that missing or incomplete inputs return an empty list.
 */
test("missing input returns an empty list", () => {
  const spot = {
    noiseLevel: "Quiet",
    outlets: true,
    wifi: true,
    tags: ["quiet zone"],
  };

  assert.deepEqual(explainMatch(null, spot), []);
  assert.deepEqual(explainMatch(spot, undefined), []);
  assert.deepEqual(explainMatch({}, {}), []);
});

/**
 * Test that the closest spots are returned in order.
 */
test("finds the closest spots in order", () => {
  const matches = findSimilarSpots(knnSpots[0], knnSpots, 3);

  assert.deepEqual(
    matches.map((match) => match.spot.name),
    ["Quiet B", "Quiet C", "Moderate E"],
  );
});

/**
 * Test that the target spot is never included in the results.
 */
test("target never recommends itself", () => {
  const matches = findSimilarSpots(knnSpots[0], knnSpots, 3);

  assert.equal(
    matches.some((match) => match.spot.name === "Quiet A"),
    false,
  );
});

/**
 * Test that each match includes its distance and reasons.
 */
test("each match has a distance and reasons", () => {
  const matches = findSimilarSpots(knnSpots[0], knnSpots, 3);

  assert.equal(matches[0].spot.name, "Quiet B");
  assert.equal(matches[0].distance, 0);
  assert.deepEqual(matches[0].reasons, [
    "Same noise level",
    "Both have outlets",
    "Both have Wi-Fi",
    "1 shared tag",
  ]);
});

/**
 * Test that k controls the number of results and invalid k defaults to 3.
 */
test("k works and bad k falls back to 3", () => {
  assert.equal(findSimilarSpots(knnSpots[0], knnSpots, 1).length, 1);
  assert.equal(findSimilarSpots(knnSpots[0], knnSpots, 10).length, 4);

  for (const k of [0, -1, 2.5, "2"]) {
    assert.equal(findSimilarSpots(knnSpots[0], knnSpots, k).length, 3);
  }
});

/**
 * Test that invalid inputs are handled without crashing.
 */
test("bad input returns an empty list or skips invalid spots", () => {
  assert.deepEqual(findSimilarSpots(null, knnSpots), []);
  assert.deepEqual(findSimilarSpots(knnSpots[0], null), []);

  const spotsWithInvalidEntries = [null, knnSpots[1], { noiseLevel: "Quiet" }];

  const matches = findSimilarSpots(knnSpots[0], spotsWithInvalidEntries);

  assert.equal(matches.length, 2);
});
