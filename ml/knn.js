// Mapping noise levels to numbers so they can be compared
const NOISE_VALUES = { Quiet: 0, Moderate: 0.5, Loud: 1 };

/** Helper function that cleans a list of tags into a Set of unique lowercase tags */
function cleanTags(tags) {
  // If tags is not a list return an empty Set
  if (!Array.isArray(tags)) {
    return new Set();
  }

  // Keep only non-empty strings, then trim and lowercase them
  const cleaned = tags
    .filter((tag) => typeof tag === "string" && tag.trim() !== "")
    .map((tag) => tag.trim().toLowerCase());

  // Turning it into a Set removes duplicates
  return new Set(cleaned);
}

/** Returns how similar two tag lists are, from 0 (nothing shared) to 1 (identical) */
export function tagSimilarity(tagsA, tagsB) {
  // Clean both tag lists
  const setA = cleanTags(tagsA);
  const setB = cleanTags(tagsB);

  // Count every unique tag across both lists
  const total = new Set([...setA, ...setB]).size;

  // If neither list has tags return 0 so we don't divide by zero
  if (total === 0) {
    return 0;
  }

  // Count how many tags both lists share
  let shared = 0;
  for (const tag of setA) {
    if (setB.has(tag)) {
      shared++;
    }
  }

  // Return shared tags divided by total unique tags
  return shared / total;
}

/** Measures how different two spots are from 0 (identical) to larger numbers (more different) */
export function spotDistance(a, b) {
  // A missing spot can't be compared, so treat it as infinitely far away
  if (!a || !b) {
    return Infinity;
  }

  // Get numeric noise levels, falling back to 0.5 if missing or unknown
  const noiseA = NOISE_VALUES[a.noiseLevel] ?? 0.5;
  const noiseB = NOISE_VALUES[b.noiseLevel] ?? 0.5;
  const noiseDiff = noiseA - noiseB;

  // Convert boolean outlets into 1 or 0 and find the difference
  const outletsA = a.outlets === true ? 1 : 0;
  const outletsB = b.outlets === true ? 1 : 0;
  const outletsDiff = outletsA - outletsB;

  // Convert boolean Wi-Fi into 1 or 0 and find the difference
  const wifiA = a.wifi === true ? 1 : 0;
  const wifiB = b.wifi === true ? 1 : 0;
  const wifiDiff = wifiA - wifiB;

  // If neither spot has tags they match on tags, otherwise flip tag similarity
  const bothNoTags =
    cleanTags(a.tags).size === 0 && cleanTags(b.tags).size === 0;
  const tagsDiff = bothNoTags ? 0 : 1 - tagSimilarity(a.tags, b.tags);

  // Calculate Euclidean distance by squaring differences, summing them, and taking the square root
  return Math.sqrt(
    noiseDiff ** 2 + outletsDiff ** 2 + wifiDiff ** 2 + tagsDiff ** 2,
  );
}
