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
