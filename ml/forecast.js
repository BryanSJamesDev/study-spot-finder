import { crowdToScore, scoreToCrowd, getCampusDayAndHour } from "./crowd.js";

// Days that count as the weekend, as named by getCampusDayAndHour
const WEEKEND_DAYS = ["Saturday", "Sunday"];

// A check-in loses half of its weight every this many days
const HALF_LIFE_DAYS = 14;

// Bigger numbers make confidence grow more slowly as check-ins are added
const CONFIDENCE_SCALE = 3;

// Time constants in milliseconds
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Checks whether a day name is a weekend day.
 * @param {string} day - A full weekday name like "Sunday"
 * @returns {boolean}
 */
export function isWeekend(day) {
  return WEEKEND_DAYS.includes(day);
}

/**
 * How much a check-in's hour matters for the hour being forecast.
 * Same hour counts fully, each hour away halves it, and 3 or more hours away
 * does not count at all.
 * @param {number} hourA - Hour from 0 to 23
 * @param {number} hourB - Hour from 0 to 23
 * @returns {number} A weight from 0 to 1 (NaN if an hour is not a number)
 */
export function hourWeight(hourA, hourB) {
  const distance = Math.abs(hourA - hourB);
  return distance > 2 ? 0 : 0.5 ** distance;
}

/**
 * How much a check-in's day matters for the day being forecast.
 * Same day counts fully, another day of the same kind (weekday or weekend)
 * counts a little, and a different kind of day does not count.
 * @param {string} dayA - A full weekday name
 * @param {string} dayB - A full weekday name
 * @returns {number} A weight of 1, 0.4 or 0
 */
export function dayWeight(dayA, dayB) {
  if (dayA === dayB) {
    return 1;
  }
  return isWeekend(dayA) === isWeekend(dayB) ? 0.4 : 0;
}

/**
 * How much a check-in still matters based on its age. The weight halves every
 * HALF_LIFE_DAYS days, so recent check-ins count more than old ones.
 * @param {string|Date} createdAt - When the check-in was made
 * @param {string|Date} [now] - The current time
 * @returns {number} A weight from 0 to 1 (0 if createdAt is not a valid date)
 */
export function recencyWeight(createdAt, now = new Date()) {
  const ageMs = new Date(now).getTime() - new Date(createdAt).getTime();
  if (Number.isNaN(ageMs)) {
    return 0;
  }

  // A check-in from the future is treated as brand new
  const ageDays = Math.max(ageMs, 0) / MS_PER_DAY;
  return 0.5 ** (ageDays / HALF_LIFE_DAYS);
}

/**
 * Turns a confidence number into a word.
 * @param {number} confidence - A number from 0 to 1
 * @returns {"low"|"medium"|"high"}
 */
export function confidenceLabel(confidence) {
  if (confidence >= 0.67) {
    return "high";
  }
  if (confidence >= 0.34) {
    return "medium";
  }
  return "low";
}

/**
 * Rounds a number to 2 decimal places.
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Forecasts how busy one spot will be at a given day and hour.
 *
 * Every check-in votes with its crowd score (1 to 3). A vote is weighted by how
 * close the check-in is to the target day and hour and by how recent it is,
 * then the votes are averaged. Confidence grows as more matching check-ins
 * add up, so a spot with little data gets a low confidence.
 *
 * @param {object[]} checkins - Check-ins for ONE spot
 * @param {object} target
 * @param {string} target.day - Full weekday name, like "Sunday"
 * @param {number} target.hour - Hour from 0 to 23
 * @param {string|Date} [target.now] - The current time
 * @returns {{level: string|null, score: number|null, confidence: number, sampleSize: number}}
 */
export function forecastCrowd(checkins, { day, hour, now = new Date() }) {
  let weightedScores = 0;
  let totalWeight = 0;
  let sampleSize = 0;

  for (const checkin of checkins) {
    // Skip check-ins with an unknown crowd level
    const score = crowdToScore(checkin.crowdLevel);
    if (score === null) {
      continue;
    }

    // Combine how close, how similar and how recent the check-in is
    const weight =
      dayWeight(day, checkin.day) *
      hourWeight(hour, checkin.hour) *
      recencyWeight(checkin.createdAt, now);

    // Also skips NaN, which comes from bad hours
    if (!(weight > 0)) {
      continue;
    }

    weightedScores += weight * score;
    totalWeight += weight;
    sampleSize += 1;
  }

  // Nothing close enough to base a forecast on
  if (totalWeight === 0) {
    return { level: null, score: null, confidence: 0, sampleSize: 0 };
  }

  const score = weightedScores / totalWeight;
  return {
    level: scoreToCrowd(score),
    score: round2(score),
    confidence: round2(1 - Math.exp(-totalWeight / CONFIDENCE_SCALE)),
    sampleSize,
  };
}

/**
 * Forecasts one spot for each of the next few hours, starting with the
 * current hour, using campus time.
 * @param {object[]} checkins - Check-ins for ONE spot
 * @param {object} [options]
 * @param {string|Date} [options.now] - The current time
 * @param {number} [options.hours] - How many hours to forecast
 * @returns {object[]} One forecast per hour, each with day and hour added
 */
export function forecastNextHours(
  checkins,
  { now = new Date(), hours = 6 } = {},
) {
  const start = new Date(now).getTime();

  return Array.from({ length: hours }, (_, offset) => {
    const { day, hour } = getCampusDayAndHour(
      new Date(start + offset * MS_PER_HOUR),
    );
    return { day, hour, ...forecastCrowd(checkins, { day, hour, now }) };
  });
}
