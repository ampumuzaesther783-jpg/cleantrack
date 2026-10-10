const assert = require("node:assert/strict");
const pool = require("../config/db");
const controller = require("../controllers/notificationController");

const originalQuery = pool.query;
const userId = 42;
const calls = [];
let ownedNotificationId = "7";
pool.query = async (sql, params) => {
  calls.push({ sql, params });
  if (sql.startsWith("SELECT id FROM notifications")) {
    return [[String(params[0]) === ownedNotificationId ? { id: params[0] } : undefined].filter(Boolean), []];
  }
  if (sql.startsWith("SELECT COUNT")) return [[{ unread_count: "3" }], []];
  if (sql.startsWith("SELECT id, title")) return [[{ id: 7, user_id: userId, status: "unread" }], []];
  return [{ affectedRows: 1 }, []];
};

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
const request = (extra = {}) => ({ user: { id: userId }, params: {}, query: {}, ...extra });

const tests = [
  ["lists only notifications belonging to authenticated user", async () => {
    calls.length = 0;
    const res = makeResponse();
    await controller.getNotifications(request(), res);
    assert.equal(res.statusCode, 200);
    assert.match(calls[0].sql, /WHERE user_id = \?/);
    assert.equal(calls[0].params[0], userId);
  }],
  ["returns authenticated user's unread count", async () => {
    calls.length = 0;
    const res = makeResponse();
    await controller.getUnreadCount(request(), res);
    assert.deepEqual(res.body, { unread_count: 3 });
    assert.match(calls[0].sql, /user_id = \? AND status = 'unread'/);
    assert.equal(calls[0].params[0], userId);
  }],
  ["marks an owned notification as read", async () => {
    calls.length = 0;
    const res = makeResponse();
    await controller.markAsRead(request({ params: { id: "7" } }), res);
    assert.equal(res.statusCode, 200);
    assert.match(calls[1].sql, /WHERE id = \? AND user_id = \?/);
    assert.deepEqual(calls[1].params, ["7", userId]);
  }],
  ["does not update a notification belonging to another user", async () => {
    calls.length = 0;
    ownedNotificationId = "8";
    const res = makeResponse();
    await controller.markAsRead(request({ params: { id: "7" } }), res);
    assert.equal(res.statusCode, 404);
    assert.equal(calls.length, 1);
    ownedNotificationId = "7";
  }],
  ["mark-all update is scoped to authenticated user", async () => {
    calls.length = 0;
    const res = makeResponse();
    await controller.markAllAsRead(request(), res);
    assert.equal(res.statusCode, 200);
    assert.match(calls[0].sql, /WHERE user_id = \? AND status = 'unread'/);
    assert.deepEqual(calls[0].params, [userId]);
  }]
];

(async () => {
  let failed = 0;
  for (const [name, run] of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failed += 1; console.error(`FAIL ${name}: ${error.message}`); }
  }
  pool.query = originalQuery;
  await pool.end();
  console.log(`${tests.length - failed}/${tests.length} notification checks passed`);
  if (failed) process.exitCode = 1;
})();
