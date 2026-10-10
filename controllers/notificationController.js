const pool = require("../config/db");

const getNotifications = async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  try {
    const [notifications] = await pool.query(
      `SELECT id, title, message, status, created_at, read_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );
    res.json(notifications);
  } catch (error) {
    console.error("Could not load notifications:", error.message);
    res.status(500).json({ message: "Could not load notifications" });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const [[result]] = await pool.query(
      "SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND status = 'unread'",
      [req.user.id]
    );
    res.json({ unread_count: Number(result.unread_count) });
  } catch (error) {
    console.error("Could not load unread notification count:", error.message);
    res.status(500).json({ message: "Could not load unread count" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const [[notification]] = await pool.query(
      "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    const [result] = await pool.query(
      `UPDATE notifications SET status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Could not update notification:", error.message);
    res.status(500).json({ message: "Could not update notification" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = ? AND status = 'unread'`,
      [req.user.id]
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Could not mark notifications as read:", error.message);
    res.status(500).json({ message: "Could not update notifications" });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
