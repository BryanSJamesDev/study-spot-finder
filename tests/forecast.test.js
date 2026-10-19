import { test } from "node:test";
import assert from "node:assert/strict";
import {
  confidenceLabel,
  dayWeight,
  forecastCrowd,
  forecastNextHours,
  hourWeight,
  isWeekend,
  recencyWeight,
} from "../ml/forecast.js";

// A fixed "now" so every test gives the same answer: Sunday 4 PM campus time
const NOW = new Date("2026-10-18T20:00:00Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Builds a check-in that was made ageDays before NOW
function checkin(crowdLevel, day, hour, ageDays = 0) {
  return {
    crowdLevel,
    day,
    hour,
    createdAt: new Date(NOW.getTime() - ageDays * MS_PER_DAY).toISOString(),
  };
}

// The slot most tests forecast
const SUNDAY_4PM = { day: "Sunday", hour: 16, now: NOW };

test("isWeekend is true only for Saturday and Sunday", () => {
  assert.equal(isWeekend("Saturday"), true);
  assert.equal(isWeekend("Sunday"), true);
  assert.equal(isWeekend("Monday"), false);
  assert.equal(isWeekend("Friday"), false);
});

test("hourWeight halves for every hour away and stops after 2", () => {
  assert.equal(hourWeight(16, 16), 1);
  assert.equal(hourWeight(16, 17), 0.5);
  assert.equal(hourWeight(16, 14), 0.25);
  assert.equal(hourWeight(16, 19), 0);
});

test("dayWeight favors the same day, then the same kind of day", () => {
  assert.equal(dayWeight("Monday", "Monday"), 1);
  assert.equal(dayWeight("Monday", "Tuesday"), 0.4);
  assert.equal(dayWeight("Saturday", "Sunday"), 0.4);
  assert.equal(dayWeight("Monday", "Sunday"), 0);
});

test("recencyWeight halves every 14 days", () => {
  const ago = (days) => new Date(NOW.getTime() - days * MS_PER_DAY);
  assert.equal(recencyWeight(ago(0), NOW), 1);
  assert.equal(recencyWeight(ago(14), NOW), 0.5);
  assert.equal(recencyWeight(ago(28), NOW), 0.25);
});

test("recencyWeight treats future check-ins as new and bad dates as 0", () => {
  const future = new Date(NOW.getTime() + MS_PER_DAY);
  assert.equal(recencyWeight(future, NOW), 1);
  assert.equal(recencyWeight("not a date", NOW), 0);
});

test("forecastCrowd with no check-ins gives no forecast", () => {
  assert.deepEqual(forecastCrowd([], SUNDAY_4PM), {
    level: null,
    score: null,
    confidence: 0,
    sampleSize: 0,
  });
});

test("forecastCrowd uses check-ins from the same slot", () => {
  const checkins = [
    checkin("Very busy", "Sunday", 16),
    checkin("Very busy", "Sunday", 16),
  ];
  const forecast = forecastCrowd(checkins, SUNDAY_4PM);
  assert.equal(forecast.level, "Very busy");
  assert.equal(forecast.score, 3);
  assert.equal(forecast.sampleSize, 2);
});

test("forecastCrowd weights a nearby hour less than the exact hour", () => {
  // Exact hour counts 1 and the next hour counts 0.5: (1 + 1.5) / 1.5
  const checkins = [
    checkin("Not busy", "Sunday", 16),
    checkin("Very busy", "Sunday", 17),
  ];
  const forecast = forecastCrowd(checkins, SUNDAY_4PM);
  assert.equal(forecast.score, 1.67);
  assert.equal(forecast.level, "Moderate");
});

test("forecastCrowd ignores check-ins from unrelated slots", () => {
  const checkins = [
    checkin("Very busy", "Wednesday", 16),
    checkin("Very busy", "Sunday", 22),
  ];
  const forecast = forecastCrowd(checkins, SUNDAY_4PM);
  assert.equal(forecast.level, null);
  assert.equal(forecast.sampleSize, 0);
});

test("forecastCrowd trusts recent check-ins over old ones", () => {
  const checkins = [
    checkin("Not busy", "Sunday", 16, 60),
    checkin("Very busy", "Sunday", 16, 0),
  ];
  assert.equal(forecastCrowd(checkins, SUNDAY_4PM).level, "Very busy");
});

test("forecastCrowd has less confidence in another day of the same kind", () => {
  const sameDay = forecastCrowd([checkin("Very busy", "Monday", 10)], {
    day: "Monday",
    hour: 10,
    now: NOW,
  });
  const otherDay = forecastCrowd([checkin("Very busy", "Tuesday", 10)], {
    day: "Monday",
    hour: 10,
    now: NOW,
  });
  assert.equal(sameDay.confidence, 0.28);
  assert.equal(otherDay.confidence, 0.12);
  assert.equal(otherDay.level, "Very busy");
});

test("forecastCrowd gains confidence as check-ins are added", () => {
  const one = [checkin("Moderate", "Sunday", 16)];
  const ten = Array.from({ length: 10 }, () =>
    checkin("Moderate", "Sunday", 16),
  );
  assert.equal(forecastCrowd(one, SUNDAY_4PM).confidence, 0.28);
  assert.equal(forecastCrowd(ten, SUNDAY_4PM).confidence, 0.96);
});

test("forecastCrowd skips check-ins with bad data", () => {
  const checkins = [
    checkin("Packed", "Sunday", 16),
    { crowdLevel: "Very busy", day: "Sunday", createdAt: NOW.toISOString() },
    { crowdLevel: "Very busy", day: "Sunday", hour: 16, createdAt: "nope" },
    checkin("Not busy", "Sunday", 16),
  ];
  const forecast = forecastCrowd(checkins, SUNDAY_4PM);
  assert.equal(forecast.sampleSize, 1);
  assert.equal(forecast.level, "Not busy");
});

test("confidenceLabel turns confidence into low, medium or high", () => {
  assert.equal(confidenceLabel(0), "low");
  assert.equal(confidenceLabel(0.33), "low");
  assert.equal(confidenceLabel(0.34), "medium");
  assert.equal(confidenceLabel(0.66), "medium");
  assert.equal(confidenceLabel(0.67), "high");
  assert.equal(confidenceLabel(1), "high");
});

test("forecastNextHours starts at the current campus hour", () => {
  const forecasts = forecastNextHours([], { now: NOW, hours: 3 });
  assert.deepEqual(
    forecasts.map((f) => [f.day, f.hour]),
    [
      ["Sunday", 16],
      ["Sunday", 17],
      ["Sunday", 18],
    ],
  );
});

test("forecastNextHours rolls over to the next day at midnight", () => {
  // 10:30 PM Sunday campus time
  const lateNight = new Date("2026-10-19T02:30:00Z");
  const forecasts = forecastNextHours([], { now: lateNight, hours: 3 });
  assert.deepEqual(
    forecasts.map((f) => [f.day, f.hour]),
    [
      ["Sunday", 22],
      ["Sunday", 23],
      ["Monday", 0],
    ],
  );
});

test("forecastNextHours defaults to 6 hours and includes the forecast", () => {
  const checkins = [checkin("Very busy", "Sunday", 16)];
  const forecasts = forecastNextHours(checkins, { now: NOW });
  assert.equal(forecasts.length, 6);
  assert.equal(forecasts[0].level, "Very busy");
  assert.equal(forecasts[0].sampleSize, 1);
});
