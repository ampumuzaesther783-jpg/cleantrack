const assert = require("node:assert/strict");
const pool = require("../config/db");
const { register } = require("../controllers/authController");
const { getFeedbackByPickup } = require("../controllers/feedbackController");

const originalQuery = pool.query;
const makeResponse = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

(async () => {
  let failed = 0;
  try {
    for (const [name, run] of [
      ["public registration requires admin activation for manager and driver accounts", async () => {
        pool.query = async () => { throw new Error("Database should not be queried for a forbidden role"); };
        const forbidden = makeResponse();
        await register({ body: { full_name: "Test User", email: "test@example.com", password: "not-a-real-password", role: "admin" } }, forbidden);
        assert.equal(forbidden.statusCode, 403);

        let inserted;
        pool.query = async (sql, params) => {
          if (sql.startsWith("SELECT id FROM users")) return [[], []];
          inserted = params;
          return [{ insertId: 77 }, []];
        };
        for (const role of ["manager", "driver"]) {
          const res = makeResponse();
          await register({ body: { full_name: "Test User", email: `${role}@example.com`, password: "not-a-real-password", role } }, res);
          assert.equal(res.statusCode, 202);
          assert.equal(res.body.pendingApproval, true);
          assert.equal(res.body.user.status, "inactive");
          assert.equal(inserted[4], role);
          assert.equal(inserted[5], "inactive");
        }
      }],
      ["customer feedback lookup is scoped to that customer", async () => {
        let call;
        pool.query = async (sql, params) => { call = { sql, params }; return [[], []]; };
        const res = makeResponse();
        await getFeedbackByPickup({ params: { pickupId: "17" }, user: { id: 23, role: "customer" } }, res);
        assert.equal(res.statusCode, 200);
        assert.match(call.sql, /pf\.customer_id = \?/);
        assert.deepEqual(call.params, ["17", 23]);
      }],
      ["manager feedback lookup is scoped to the manager's companies", async () => {
        let call;
        pool.query = async (sql, params) => { call = { sql, params }; return [[], []]; };
        const res = makeResponse();
        await getFeedbackByPickup({ params: { pickupId: "17" }, user: { id: 31, role: "manager" } }, res);
        assert.match(call.sql, /wc\.manager_id = \?/);
        assert.deepEqual(call.params, ["17", 31]);
      }]
    ]) {
      try { await run(); console.log(`PASS ${name}`); }
      catch (error) { failed += 1; console.error(`FAIL ${name}: ${error.message}`); }
    }
  } finally {
    pool.query = originalQuery;
    await pool.end();
  }
  console.log(`${3 - failed}/3 integration security checks passed`);
  if (failed) process.exitCode = 1;
})();
