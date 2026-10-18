// Time zone of the campus, so days and hours match what students see
const CAMPUS_TIME_ZONE = "America/New_York";

// Crowd levels from least busy to most busy, in score order
export const CROWD_LEVELS = ["Not busy", "Moderate", "Very busy"];

// Turn a crowd level into a number (Not busy = 1, Very busy = 3)
export function crowdToScore(level) {
  const index = CROWD_LEVELS.indexOf(level);
  return index === -1 ? null : index + 1;
}

// Turn an average score back into the closest crowd level
export function scoreToCrowd(score) {
  const rounded = Math.round(score);
  const clamped = Math.min(Math.max(rounded, 1), CROWD_LEVELS.length);
  return CROWD_LEVELS[clamped - 1];
}

// Formats a date as a weekday and an hour (0 to 23) in campus time
const campusClock = new Intl.DateTimeFormat("en-US", {
  timeZone: CAMPUS_TIME_ZONE,
  weekday: "long",
  hour: "numeric",
  hourCycle: "h23",
});

// Get the campus day name and hour (0 to 23) for a date
export function getCampusDayAndHour(date = new Date()) {
  const parts = campusClock.formatToParts(date);
  const day = parts.find((part) => part.type === "weekday").value;
  const hour = Number(parts.find((part) => part.type === "hour").value);
  return { day, hour };
}
