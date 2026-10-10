const assert = require("node:assert/strict");
const pool = require("../config/db");
const assignments = require("../controllers/assignmentController");
const reschedules = require("../controllers/pickupRescheduleController");
const pickups = require("../controllers/pickupController");
const { processDueSchedules } = require("../services/recurringScheduleProcessor");

const originals = { query: pool.query, getConnection: pool.getConnection };
const insertedNotifications = [];
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const connectionFor = (queryHandler) => ({
  beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
  query: async (sql, params = []) => {
    if (sql.includes("INSERT INTO notifications")) { insertedNotifications.push(params); return [{ insertId: insertedNotifications.length }, []]; }
    return queryHandler(sql, params);
  }
});

const tests = [
  ["pickup assignment notifies the assigned driver and customer", async () => {
    insertedNotifications.length = 0;
    const connection = connectionFor(async (sql) => {
      if (sql.includes("INSERT INTO pickup_assignments")) return [{ insertId: 55 }, []];
      if (sql.includes("SELECT customer_id FROM pickup_requests")) return [[{ customer_id: 8 }], []];
      if (sql.includes("UPDATE pickup_requests")) return [{ affectedRows: 1 }, []];
      throw new Error(`Unexpected assignment query: ${sql}`);
    });
    pool.query = async (sql) => sql.includes("waste_companies") ? [[{ id: 3 }], []] : [[{ id: 2 }], []];
    pool.getConnection = async () => connection;
    const res = response();
    await assignments.createAssignment({ user: { id: 2 }, body: { pickup_request_id: 10, truck_id: 2, driver_id: 4 } }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(insertedNotifications.map(([userId]) => userId), [4, 8]);
  }],
  ["pickup status changes notify the customer only when the state changes", async () => {
    insertedNotifications.length = 0;
    let currentStatus = "assigned";
    pool.getConnection = async () => connectionFor(async (sql, params) => {
      if (sql.includes("FROM pickup_assignments pa JOIN pickup_requests")) return [[{ status: currentStatus, pickup_id: 10, customer_id: 8 }], []];
      if (sql.startsWith("UPDATE pickup_assignments")) { currentStatus = params[0]; return [{ affectedRows: 1 }, []]; }
      if (sql.startsWith("UPDATE pickup_requests")) return [{ affectedRows: 1 }, []];
      throw new Error(`Unexpected assignment status query: ${sql}`);
    });
    let res = response();
    await assignments.updateStatus({ user: { id: 4 }, params: { id: "55" }, body: { status: "on_the_way" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(insertedNotifications[0][0], 8);
    assert.equal(insertedNotifications[0][1], "Pickup team on the way");
    insertedNotifications.length = 0;
    res = response();
    await assignments.updateStatus({ user: { id: 4 }, params: { id: "55" }, body: { status: "on_the_way" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(insertedNotifications.length, 0);
  }],
  ["customer pickup submission creates a confirmation notification", async () => {
    insertedNotifications.length = 0;
    pool.query = async () => [[{ id: 1 }], []];
    pool.getConnection = async () => connectionFor(async (sql) => {
      if (sql.includes("INSERT INTO pickup_requests")) return [{ insertId: 10 }, []];
      throw new Error(`Unexpected pickup creation query: ${sql}`);
    });
    const res = response();
    await pickups.createPickup({
      user: { id: 8 }, body: { location_id: 1, waste_category_id: 2, estimated_bin_level: 80 }, file: null
    }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(insertedNotifications[0][0], 8);
    assert.equal(insertedNotifications[0][1], "Pickup request received");
  }],
  ["reschedule submission notifies the assigned manager", async () => {
    insertedNotifications.length = 0;
    pool.getConnection = async () => connectionFor(async (sql) => {
      if (sql.includes("FROM pickup_requests WHERE id")) return [[{ id: 10, status: "assigned", customer_id: 8, scheduled_for: null }], []];
      if (sql.includes("FROM pickup_assignments pa")) return [[{ company_id: 3, manager_id: 2 }], []];
      if (sql.includes("SELECT id FROM pickup_reschedule_requests")) return [[], []];
      if (sql.includes("INSERT INTO pickup_reschedule_requests")) return [{ insertId: 90 }, []];
      throw new Error(`Unexpected reschedule submission query: ${sql}`);
    });
    const res = response();
    await reschedules.requestReschedule({ user: { id: 8 }, body: { pickup_request_id: 10, requested_for: "2099-08-17T14:30", reason: "Schedule change" } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(insertedNotifications.length, 1);
    assert.equal(insertedNotifications[0][0], 2);
    assert.equal(insertedNotifications[0][1], "Pickup reschedule requested");
  }],
  ["approval and rejection notify the customer", async () => {
    for (const decision of ["approved", "rejected"]) {
      insertedNotifications.length = 0;
      pool.getConnection = async () => connectionFor(async (sql) => {
        if (sql.includes("FROM pickup_reschedule_requests WHERE id")) return [[{ id: 90, pickup_request_id: 10, customer_id: 8, company_id: 3, requested_for: "2099-08-17 14:30:00", status: "pending" }], []];
        if (sql.includes("FROM waste_companies WHERE id")) return [[{ id: 3 }], []];
        if (sql.includes("FROM pickup_assignments WHERE pickup_request_id")) return [[{ id: 55 }], []];
        if (sql.includes("FROM pickup_requests WHERE id")) return [[{ id: 10, status: "assigned" }], []];
        if (sql.startsWith("UPDATE ")) return [{ affectedRows: 1 }, []];
        throw new Error(`Unexpected reschedule decision query: ${sql}`);
      });
      const res = response();
      await reschedules.decideRequest({ user: { id: 2 }, params: { id: "90" }, body: { status: decision, response: "Decision note" } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(insertedNotifications.length, 1);
      assert.equal(insertedNotifications[0][0], 8);
      assert(insertedNotifications[0][1].toLowerCase().includes(decision));
    }
  }],
  ["recurring pickup generation notifies the schedule owner", async () => {
    insertedNotifications.length = 0;
    pool.query = async () => [[{ id: 9 }], []];
    pool.getConnection = async () => connectionFor(async (sql) => {
      if (sql.includes("FROM recurring_pickup_schedules")) return [[{
        id: 9, status: "active", customer_id: 8, location_id: 1, waste_category_id: 2,
        frequency: "weekly", next_pickup_date: "2000-01-01", preferred_time: "08:00:00"
      }], []];
      if (sql.includes("FROM recurring_pickup_occurrences")) return [[], []];
      if (sql.includes("INSERT INTO pickup_requests")) return [{ insertId: 101 }, []];
      if (sql.includes("INSERT INTO recurring_pickup_occurrences")) return [{ insertId: 1 }, []];
      if (sql.startsWith("UPDATE recurring_pickup_schedules")) return [{ affectedRows: 1 }, []];
      throw new Error(`Unexpected recurring processor query: ${sql}`);
    });
    await processDueSchedules();
    assert.equal(insertedNotifications.length, 1);
    assert.equal(insertedNotifications[0][0], 8);
    assert.equal(insertedNotifications[0][1], "Recurring pickup generated");
  }]
];

(async () => {
  let failed = 0;
  try {
    for (const [name, run] of tests) {
      try { await run(); console.log(`PASS ${name}`); }
      catch (error) { failed += 1; console.error(`FAIL ${name}: ${error.stack || error.message}`); }
    }
  } finally {
    pool.query = originals.query;
    pool.getConnection = originals.getConnection;
    await pool.end();
  }
  console.log(`${tests.length - failed}/${tests.length} notification workflow checks passed`);
  if (failed) process.exitCode = 1;
})();
