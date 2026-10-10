const assert = require("node:assert/strict");
const { validateRequest } = require("../controllers/pickupRescheduleController");

const validRequest = () => ({
  pickup_request_id: "12",
  requested_for: "2099-08-17T14:30",
  reason: "I will not be home in the morning."
});

const tests = [
  ["accepts valid future pickup reschedule data", () => {
    assert.equal(validateRequest(validRequest()), null);
  }],
  ["rejects a malformed pickup ID", () => {
    assert.equal(validateRequest({ ...validRequest(), pickup_request_id: "12.5" }), "Select a valid pickup request");
  }],
  ["rejects an impossible calendar date", () => {
    assert.equal(validateRequest({ ...validRequest(), requested_for: "2099-02-30T14:30" }), "Choose a valid future date and time");
  }],
  ["rejects an invalid clock time", () => {
    assert.equal(validateRequest({ ...validRequest(), requested_for: "2099-08-17T25:90" }), "Choose a valid future date and time");
  }],
  ["rejects an overlong reason", () => {
    assert.equal(validateRequest({ ...validRequest(), reason: "x".repeat(1001) }), "Reason must be text with at most 1000 characters");
  }]
];

let failed = 0;
for (const [name, run] of tests) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

console.log(`${tests.length - failed}/${tests.length} pickup reschedule checks passed`);
if (failed) process.exitCode = 1;
