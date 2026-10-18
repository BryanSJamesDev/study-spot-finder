import test from "node:test";
import assert from "node:assert/strict";
import {
  starsToText,
  formatAverage,
  formatRatingCount,
  formatRatingDate,
  getRecentRatings,
  parseStars,
  sortByAverage,
} from "../public/js/ratingsUtils.js";

/** Test whole star counts turn into filled and empty stars. */
test("starsToText shows filled and empty stars", () => {
  assert.equal(starsToText(5), "★★★★★");
  assert.equal(starsToText(3), "★★★☆☆");
  assert.equal(starsToText(1), "★☆☆☆☆");
  assert.equal(starsToText(0), "☆☆☆☆☆");
});

/** Test averages are rounded to the nearest star. */
test("starsToText rounds to the nearest star", () => {
  assert.equal(starsToText(4.2), "★★★★☆");
  assert.equal(starsToText(4.6), "★★★★★");
  assert.equal(starsToText(2.5), "★★★☆☆");
});

/** Test counts outside the range stay between 0 and 5 stars. */
test("starsToText keeps stars between 0 and 5", () => {
  assert.equal(starsToText(9), "★★★★★");
  assert.equal(starsToText(-2), "☆☆☆☆☆");
});

/** Test values that are not numbers show as zero stars. */
test("starsToText shows zero stars for bad values", () => {
  assert.equal(starsToText("4"), "☆☆☆☆☆");
  assert.equal(starsToText(null), "☆☆☆☆☆");
  assert.equal(starsToText(undefined), "☆☆☆☆☆");
  assert.equal(starsToText(NaN), "☆☆☆☆☆");
});

/** Test averages show one decimal. */
test("formatAverage shows one decimal", () => {
  assert.equal(formatAverage(4.2), "4.2");
  assert.equal(formatAverage(3), "3.0");
  assert.equal(formatAverage(0), "0.0");
});

/** Test averages that are not numbers show N/A. */
test("formatAverage shows N/A for bad values", () => {
  assert.equal(formatAverage(undefined), "N/A");
  assert.equal(formatAverage(NaN), "N/A");
  assert.equal(formatAverage("4.2"), "N/A");
});

/** Test the rating count uses the right singular or plural word. */
test("formatRatingCount uses rating or ratings", () => {
  assert.equal(formatRatingCount(1), "1 rating");
  assert.equal(formatRatingCount(20), "20 ratings");
  assert.equal(formatRatingCount(0), "0 ratings");
  assert.equal(formatRatingCount(undefined), "0 ratings");
});

/** Test dates are shown in campus time (UTC-4 in October, UTC-5 in December). */
test("formatRatingDate uses campus time", () => {
  assert.equal(formatRatingDate("2026-10-18T02:07:02.513Z"), "Oct 17, 2026");
  assert.equal(formatRatingDate("2026-12-07T17:00:00Z"), "Dec 7, 2026");
});

/** Test dates that are not valid return an empty string. */
test("formatRatingDate returns an empty string for bad dates", () => {
  assert.equal(formatRatingDate("not a date"), "");
  assert.equal(formatRatingDate(undefined), "");
  assert.equal(formatRatingDate(null), "");
});

// Sample ratings used by the recent ratings tests
const sampleRatings = [
  {
    _id: "1",
    spotName: "Snell Quiet Floor",
    stars: 4,
    createdAt: "2026-10-10T12:00:00Z",
  },
  {
    _id: "2",
    spotName: "Egan Lobby",
    stars: 3,
    createdAt: "2026-10-12T12:00:00Z",
  },
  {
    _id: "3",
    spotName: "Snell Quiet Floor",
    stars: 5,
    createdAt: "2026-10-11T12:00:00Z",
  },
];

/** Test recent ratings come back newest first. */
test("getRecentRatings returns the newest ratings first", () => {
  const ids = getRecentRatings(sampleRatings).map((rating) => rating._id);
  assert.deepEqual(ids, ["2", "3", "1"]);
});

/** Test recent ratings can be limited to one spot. */
test("getRecentRatings filters by spot", () => {
  const ids = getRecentRatings(sampleRatings, "Snell Quiet Floor").map(
    (rating) => rating._id,
  );
  assert.deepEqual(ids, ["3", "1"]);
  assert.deepEqual(getRecentRatings(sampleRatings, "Nowhere"), []);
});

/** Test recent ratings can be limited to a number of results. */
test("getRecentRatings applies the limit", () => {
  const ids = getRecentRatings(sampleRatings, "", 2).map(
    (rating) => rating._id,
  );
  assert.deepEqual(ids, ["2", "3"]);
});

/** Test recent ratings does not change the original list. */
test("getRecentRatings does not change the original list", () => {
  getRecentRatings(sampleRatings);
  const ids = sampleRatings.map((rating) => rating._id);
  assert.deepEqual(ids, ["1", "2", "3"]);
});

/** Test recent ratings returns an empty list when it is not given a list. */
test("getRecentRatings returns an empty list for bad input", () => {
  assert.deepEqual(getRecentRatings(undefined), []);
  assert.deepEqual(getRecentRatings(null), []);
  assert.deepEqual(getRecentRatings("ratings"), []);
});

/** Test the radio values 1 to 5 turn into numbers. */
test("parseStars turns 1 to 5 into numbers", () => {
  assert.equal(parseStars("1"), 1);
  assert.equal(parseStars("3"), 3);
  assert.equal(parseStars("5"), 5);
});

/** Test anything else is not a valid star value. */
test("parseStars returns null for bad values", () => {
  for (const value of ["0", "6", "3.5", "", "abc", null, undefined, 4]) {
    assert.equal(parseStars(value), null);
  }
});

/** Test averages are sorted highest first, with ties sorted by name. */
test("sortByAverage sorts highest first", () => {
  const averages = [
    { spotName: "B Spot", average: 4.1, count: 3 },
    { spotName: "A Spot", average: 4.1, count: 5 },
    { spotName: "C Spot", average: 4.8, count: 2 },
    { spotName: "D Spot", average: 2.2, count: 9 },
  ];

  const names = sortByAverage(averages).map((item) => item.spotName);
  assert.deepEqual(names, ["C Spot", "A Spot", "B Spot", "D Spot"]);

  // The original list is not changed
  assert.equal(averages[0].spotName, "B Spot");
});

/** Test sorting averages returns an empty list for bad input. */
test("sortByAverage returns an empty list for bad input", () => {
  assert.deepEqual(sortByAverage(undefined), []);
  assert.deepEqual(sortByAverage("averages"), []);
});
