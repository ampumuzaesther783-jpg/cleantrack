const express = require("express");
const {
  createSchedule,
  getMySchedules,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule
} = require("../controllers/recurringScheduleController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.use(protect, allowRoles("customer"));
router.post("/", asyncHandler(createSchedule));
router.get("/my-schedules", asyncHandler(getMySchedules));
router.put("/:id", asyncHandler(updateSchedule));
router.patch("/:id/status", asyncHandler(updateScheduleStatus));
router.delete("/:id", asyncHandler(deleteSchedule));

module.exports = router;
