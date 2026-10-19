/** GLOBAL VARIABLES */
// Highest star rating allowed
const MAX_STARS = 5;

// Time zone of the campus, so dates match what students see
const CAMPUS_TIME_ZONE = "America/New_York";

/** Turns a star count into text like "★★★★☆", rounded to the nearest star */
export function starsToText(stars) {
  // Anything that is not a number shows as zero stars
  const rounded =
    typeof stars === "number" && Number.isFinite(stars) ? Math.round(stars) : 0;

  // Keep the number of filled stars between 0 and 5
  const filled = Math.min(Math.max(rounded, 0), MAX_STARS);

  return "★".repeat(filled) + "☆".repeat(MAX_STARS - filled);
}

/** Formats an average rating with one decimal, like "4.2" */
export function formatAverage(average) {
  if (typeof average !== "number" || !Number.isFinite(average)) {
    return "N/A";
  }
  return average.toFixed(1);
}

/** Formats how many ratings there are, like "1 rating" or "20 ratings" */
export function formatRatingCount(count) {
  const total = Number.isFinite(count) ? count : 0;
  return total === 1 ? "1 rating" : `${total} ratings`;
}

/** Formats a date like "Oct 17, 2026" in campus time, or "" if it is not valid */
export function formatRatingDate(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: CAMPUS_TIME_ZONE,
  });
}

/** Gets the newest ratings, for one spot or for every spot if no spot is given */
export function getRecentRatings(ratings, spotName = "", limit = 20) {
  if (!Array.isArray(ratings)) {
    return [];
  }

  // Keep only the ratings for the spot, if one was given
  const matches = spotName
    ? ratings.filter((rating) => rating.spotName === spotName)
    : [...ratings];

  // Newest first, ratings without a valid date go last
  const timeOf = (rating) => new Date(rating.createdAt).getTime() || 0;
  matches.sort((a, b) => timeOf(b) - timeOf(a));

  return matches.slice(0, limit);
}

/** Turns the selected radio value into a whole number from 1 to 5, or null */
export function parseStars(value) {
  if (typeof value !== "string" || !/^[1-5]$/.test(value)) {
    return null;
  }
  return Number(value);
}

/** Sorts averages from highest to lowest, ties are sorted by spot name */
export function sortByAverage(averages) {
  if (!Array.isArray(averages)) {
    return [];
  }

  return [...averages].sort(
    (a, b) => b.average - a.average || a.spotName.localeCompare(b.spotName),
  );
}
