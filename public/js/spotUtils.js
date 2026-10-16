/** Format closing time to be readable */
function formatClosingTime(time) {
  // Handle if time is not a string or not HH:MM
  if (
    typeof time !== "string" ||
    !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)
  ) {
    return "Hours unknown";
  }
  // Split into hours and minutes
  const [hours, minutes] = time.split(":");
  // Figure out which hours are AM vs PM
  let period;
  if (Number(hours) >= 12) {
    period = "PM";
  } else {
    period = "AM";
  }
  // Convert to 12 hour time
  const hour12 = Number(hours) % 12 || 12;

  return `${hour12}:${minutes} ${period}`;
}

/** Get spot tags for each spot */
function getSpotTags(spot) {
  // If there is no spot return an empty list
  if (!spot) {
    return [];
  }

  const tags = [];

  // If there are outlets then push outlets to tags
  if (spot.outlets === true) {
    tags.push("Outlets");
  }

  // If there is wifi then push wifi to tags
  if (spot.wifi === true) {
    tags.push("Wi-Fi");
  }

  // If a spot already has tags
  if (Array.isArray(spot.tags)) {
    // loop through tags and push each one that is not an empty string
    for (const tag of spot.tags) {
      if (typeof tag === "string" && tag.trim() !== "") {
        tags.push(tag);
      }
    }
  }

  return tags;
}

/** Parse tags so that they can be properly read */
function parseTags(text) {
  //If text isnt a string return an empty array
  if (typeof text !== "string") {
    return [];
  }

  // Cut the text at every comma, remove space and drop empty pieces
  const result = text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");

  return result;
}
export { formatClosingTime, getSpotTags, parseTags };
