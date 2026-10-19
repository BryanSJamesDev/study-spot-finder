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

/** Filters spots based on search, noise level, outlets, wifi, and tag */
function filterSpots(spots, filters) {
  // Handle if spots is not an array and a bad input
  if (!Array.isArray(spots)) {
    return [];
  }

  // Handle missing filters
  const f = filters ?? {};

  // Return spots that match all selected filters
  return spots.filter((spot) => {
    // Check the search filter against the name and building
    if (typeof f.search === "string" && f.search.trim() !== "") {
      const search = f.search.trim().toLowerCase();
      const name = typeof spot.name === "string" ? spot.name.toLowerCase() : "";
      const building =
        typeof spot.building === "string" ? spot.building.toLowerCase() : "";

      if (!name.includes(search) && !building.includes(search)) {
        return false;
      }
    }

    // Check the noise level filter
    if (f.noiseLevel && spot.noiseLevel !== f.noiseLevel) {
      return false;
    }

    // Check the outlets filter
    if (f.outlets === true && spot.outlets !== true) {
      return false;
    }

    // Check the wifi filter
    if (f.wifi === true && spot.wifi !== true) {
      return false;
    }

    // Check the tag filter
    if (typeof f.tag === "string" && f.tag.trim() !== "") {
      const tag = f.tag.trim().toLowerCase();
      const tags = Array.isArray(spot.tags) ? spot.tags : [];

      if (!tags.some((t) => typeof t === "string" && t.toLowerCase() === tag)) {
        return false;
      }
    }

    // Keep the spot if it passes every filter
    return true;
  });
}

/** Formats match reason strings into a single dot-separated line */
function formatMatchReasons(reasons) {
  // Keep only non-empty string reasons if reasons is an array, then trim whitespace
  const validReasons = Array.isArray(reasons)
    ? reasons
        .filter((reason) => typeof reason === "string" && reason.trim() !== "")
        .map((reason) => reason.trim())
    : [];

  // Fallback to "Similar overall" if no specific reasons remain
  if (validReasons.length === 0) {
    return "Similar overall";
  }

  // Join valid reasons with a centered dot separator
  return validReasons.join(" · ");
}

export {
  formatClosingTime,
  getSpotTags,
  parseTags,
  filterSpots,
  formatMatchReasons,
};
