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
