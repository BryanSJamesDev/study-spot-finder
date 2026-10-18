import test from "node:test";
import assert from "node:assert/strict";
import { tagSimilarity } from "../ml/knn.js";

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
