const express = require("express");
const { createFeedback, getFeedbackByPickup } = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/", protect, allowRoles("customer"), asyncHandler(createFeedback));
router.get("/pickup/:pickupId", protect, allowRoles("customer", "driver", "manager", "admin"), asyncHandler(getFeedbackByPickup));

module.exports = router;
