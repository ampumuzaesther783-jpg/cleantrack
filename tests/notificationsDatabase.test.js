const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const notificationRoutes = require("../routes/notificationRoutes");

const run = async () => {
  // A short-lived test-only secret exercises protect without relying on local app secrets.
  process.env.JWT_SECRET = `notification-api-check-${Date.now()}-${Math.random()}`;
  let firstId;
  let secondId;
  let server;
  try {
    const [users] = await pool.query("SELECT id FROM users WHERE status = 'active' ORDER BY id LIMIT 2");
    if (users.length < 2) throw new Error("Two active users are required to check notification ownership");
    const [baselineRows] = await pool.query(
      "SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND status = 'unread'",
      [users[0].id]
    );

    const tag = `Notification API check ${Date.now()} ${Math.random()}`;
    const [first] = await pool.query(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [users[0].id, tag, "Temporary integration-test notification"]
    );
    firstId = first.insertId;
    const [second] = await pool.query(
      "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
      [users[1].id, tag, "Temporary ownership-test notification"]
    );
    secondId = second.insertId;

    const app = express();
    app.use(express.json());
    app.use("/api/notifications", notificationRoutes);
    server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    const base = `http://127.0.0.1:${server.address().port}/api/notifications`;
    const token = jwt.sign({ id: users[0].id }, process.env.JWT_SECRET, { expiresIn: "5m" });
    const headers = { Authorization: `Bearer ${token}` };

    let response = await fetch(base, { headers });
    assert.equal(response.status, 200);
    const notifications = await response.json();
    assert(notifications.some((item) => item.id === firstId));
    assert(!notifications.some((item) => item.id === secondId));
    console.log("PASS live API returns only the authenticated user's notifications");

    response = await fetch(`${base}/unread-count`, { headers });
    assert.equal(response.status, 200);
    const count = await response.json();
    assert.equal(count.unread_count, Number(baselineRows[0].unread_count) + 1);
    console.log("PASS live API unread count includes only the user's unread notification");

    response = await fetch(`${base}/${secondId}/read`, { method: "PATCH", headers });
    assert.equal(response.status, 404);
    const [otherRows] = await pool.query("SELECT status FROM notifications WHERE id = ?", [secondId]);
    assert.equal(otherRows[0].status, "unread");
    console.log("PASS live API refuses to mark another user's notification as read");

    response = await fetch(`${base}/${firstId}/read`, { method: "PATCH", headers });
    assert.equal(response.status, 200);
    const [ownRows] = await pool.query("SELECT status, read_at FROM notifications WHERE id = ?", [firstId]);
    assert.equal(ownRows[0].status, "read");
    assert(ownRows[0].read_at);
    console.log("PASS live API marks the user's notification read and records read_at");
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    const testIds = [firstId, secondId].filter(Boolean);
    if (testIds.length) await pool.query(`DELETE FROM notifications WHERE id IN (${testIds.map(() => "?").join(", ")})`, testIds);
    await pool.end();
  }
};

run().catch(async (error) => {
  console.error(`FAIL live notification API checks: ${error.message}`);
  await pool.end();
  process.exitCode = 1;
});
