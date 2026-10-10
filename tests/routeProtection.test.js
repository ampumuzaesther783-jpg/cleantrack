const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const notificationRoutes = require("../routes/notificationRoutes");
const assignmentRoutes = require("../routes/assignmentRoutes");
const recurringRoutes = require("../routes/recurringScheduleRoutes");

const originalQuery = pool.query;
const user = { id: 42, full_name: "Review User", email: "review@example.com", phone: null, role: "customer", status: "active" };
const makeResponse = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

(async () => {
  process.env.JWT_SECRET = `route-review-${Date.now()}`;
  pool.query = async (sql) => {
    if (sql.includes("FROM users WHERE id = ?")) return [[user], []];
    if (sql.includes("COUNT(*) AS unread_count")) return [[{ unread_count: 1 }], []];
    if (sql.includes("FROM notifications")) return [[{ id: 7, title: "Test", message: "Test", status: "unread" }], []];
    return [[], []];
  };
  const app = express();
  app.use(express.json());
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/recurring-schedules", recurringRoutes);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "5m" });
  try {
    const unauthenticated = await fetch(`${base}/api/notifications`);
    assert.equal(unauthenticated.status, 401);
    console.log("PASS notification route rejects unauthenticated requests");

    const customer = await fetch(`${base}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(customer.status, 200);
    assert.deepEqual(await customer.json(), { unread_count: 1 });
    console.log("PASS protected notification route accepts an authenticated active user");

    const wrongRole = await fetch(`${base}/api/assignments/driver/my-jobs`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(wrongRole.status, 403);
    console.log("PASS driver-only route rejects an authenticated customer");

    const badInput = await fetch(`${base}/api/recurring-schedules`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}"
    });
    assert.equal(badInput.status, 400);
    console.log("PASS protected recurring route validates submitted data");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery;
    await pool.end();
  }
})().catch(async (error) => {
  console.error(`FAIL route protection checks: ${error.message}`);
  pool.query = originalQuery;
  await pool.end();
  process.exitCode = 1;
});
