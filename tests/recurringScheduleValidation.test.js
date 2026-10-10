const assert = require("node:assert/strict");
const { validateSchedule, getNextPickupDate } = require("../controllers/recurringScheduleController");
const { isDue, addDays } = require("../services/recurringScheduleProcessor");

const tests = [];
const test = (name, run) => tests.push({ name, run });

const validSchedule = () => ({
  location_id: "1",
  waste_category_id: "2",
  frequency: "weekly",
  preferred_day: "1",
  preferred_time: "09:30",
  start_date: "2099-05-04"
});

test("accepts a valid recurring schedule", () => {
  assert.equal(validateSchedule(validSchedule()), null);
});

test("rejects malformed location IDs", () => {
  assert.equal(validateSchedule({ ...validSchedule(), location_id: "1.5" }), "Select a valid pickup location");
});

test("rejects malformed waste category IDs", () => {
  assert.equal(validateSchedule({ ...validSchedule(), waste_category_id: "abc" }), "Select a valid waste category");
});

test("rejects unsupported frequencies", () => {
  assert.equal(validateSchedule({ ...validSchedule(), frequency: "monthly" }), "Frequency must be weekly or biweekly");
});

test("rejects an invalid weekday", () => {
  assert.equal(validateSchedule({ ...validSchedule(), preferred_day: "8" }), "Preferred day must be between 1 (Monday) and 7 (Sunday)");
});

test("rejects invalid calendar dates and time values", () => {
  assert.equal(validateSchedule({ ...validSchedule(), start_date: "2099-02-30" }), "Enter a valid start date");
  assert.equal(validateSchedule({ ...validSchedule(), preferred_time: "25:72" }), "Enter a valid preferred time");
});

test("chooses the first preferred weekday on or after the start date", () => {
  assert.equal(getNextPickupDate("2026-10-10", 1), "2026-10-12");
  assert.equal(getNextPickupDate("2026-10-12", 1), "2026-10-12");
});

test("checks whether a schedule is due using Kampala date and time", () => {
  const schedule = { next_pickup_date: "2026-10-10", preferred_time: "09:30:00" };
  assert.equal(isDue(schedule, "2026-10-10", "09:29:59"), false);
  assert.equal(isDue(schedule, "2026-10-10", "09:30:00"), true);
  assert.equal(isDue(schedule, "2026-10-11", "08:00:00"), true);
});

test("advances a recurring occurrence by the requested interval", () => {
  assert.equal(addDays("2026-10-10", 7), "2026-10-17");
  assert.equal(addDays("2026-10-10", 14), "2026-10-24");
});

let failed = 0;
for (const { name, run } of tests) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

console.log(`${tests.length - failed}/${tests.length} recurring schedule checks passed`);
if (failed) process.exitCode = 1;
