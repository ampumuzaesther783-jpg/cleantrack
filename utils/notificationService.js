const createNotification = async (queryable, userId, title, message) => {
  await queryable.query(
    "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
    [userId, title, message]
  );
};

module.exports = { createNotification };
