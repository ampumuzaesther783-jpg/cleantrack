const express = require("express");
const {
  requestReschedule,
  getEligiblePickups,
  getMyRequests,
  getManagerPendingRequests,
  decideRequest
} = require("../controllers/pickupRescheduleController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/", protect, allowRoles("customer"), asyncHandler(requestReschedule));
router.get("/eligible-pickups", protect, allowRoles("customer"), asyncHandler(getEligiblePickups));
router.get("/my-requests", protect, allowRoles("customer"), asyncHandler(getMyRequests));
router.get("/manager/pending", protect, allowRoles("manager"), asyncHandler(getManagerPendingRequests));
router.patch("/:id/decision", protect, allowRoles("manager"), asyncHandler(decideRequest));

module.exports = router;
