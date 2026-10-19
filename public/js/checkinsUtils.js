// Crowd levels from emptiest to fullest. Must match ml/crowd.js on the server.
export const CROWD_LEVELS = ["Not busy", "Moderate", "Very busy"];

// Longest note the API accepts
export const MAX_NOTE_LENGTH = 200;

/**
 * Picks the badge modifier class for a crowd level.
 * @param {string} level - "Not busy", "Moderate" or "Very busy"
 * @returns {string} The class name, or "" if the level is unknown
 */
export function crowdBadgeClass(level) {
  const classes = {
    "Not busy": "status--success",
    Moderate: "status--warning",
    "Very busy": "status--danger",
  };
  return Object.hasOwn(classes, level) ? classes[level] : "";
}

/**
 * Turns a 24 hour clock hour into text like "2 PM".
 * @param {number} hour - A whole number from 0 to 23
 * @returns {string} The formatted hour, or "" if the hour is invalid
 */
export function formatHour(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return "";
  }
  const suffix = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${suffix}`;
}

/**
 * Describes when a check-in happened, like "Sunday at 2 PM".
 * @param {{day: string, hour: number}} checkin
 * @returns {string} The description, or "" if day or hour is missing
 */
export function formatCheckinTime(checkin) {
  const hour = formatHour(checkin.hour);
  if (!checkin.day || !hour) {
    return "";
  }
  return `${checkin.day} at ${hour}`;
}

/**
 * Turns a timestamp into text like "5 min ago".
 * @param {string} isoString - The createdAt timestamp
 * @param {number} [now] - Current time in ms, passed in so tests are stable
 * @returns {string} The relative time, or "" if the timestamp is invalid
 */
export function formatTimeAgo(isoString, now = Date.now()) {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/**
 * Formats a check-in count, like "1 check-in" or "3 check-ins".
 * @param {number} count
 * @returns {string}
 */
export function formatCheckinCount(count) {
  return `${count} check-in${count === 1 ? "" : "s"}`;
}

/**
 * Sorts the crowded-now rows with the busiest spots first.
 * Ties are broken by spot name. Does not change the original array.
 * @param {{spotName: string, average: number}[]} rows
 * @returns {{spotName: string, average: number}[]}
 */
export function sortCrowdedNow(rows) {
  return [...rows].sort(
    (a, b) => b.average - a.average || a.spotName.localeCompare(b.spotName),
  );
}

/**
 * Checks the check-in form values.
 * @param {{spotName: string, crowdLevel: string, note: string}} values
 * @returns {string[]} A list of error messages, empty if everything is valid
 */
export function validateCheckin({ spotName, crowdLevel, note }) {
  const errors = [];

  if (!spotName) {
    errors.push("Choose a spot.");
  }
  if (!CROWD_LEVELS.includes(crowdLevel)) {
    errors.push("Choose how busy it is.");
  }
  if (String(note ?? "").trim().length > MAX_NOTE_LENGTH) {
    errors.push(`Note must be ${MAX_NOTE_LENGTH} characters or fewer.`);
  }

  return errors;
}

/**
 * Builds the request body for creating or updating a check-in.
 * @param {{spotName: string, crowdLevel: string, note: string}} values
 * @returns {{spotName: string, crowdLevel: string, note: string}}
 */
export function buildCheckinBody({ spotName, crowdLevel, note }) {
  return { spotName, crowdLevel, note: String(note ?? "").trim() };
}
