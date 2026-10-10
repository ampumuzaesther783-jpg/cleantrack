const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = require("../controllers/notificationController");

const router = express.Router();
router.use(protect);
router.get("/", asyncHandler(getNotifications));
router.get("/unread-count", asyncHandler(getUnreadCount));
router.patch("/read-all", asyncHandler(markAllAsRead));
router.patch("/:id/read", asyncHandler(markAsRead));

module.exports = router;
