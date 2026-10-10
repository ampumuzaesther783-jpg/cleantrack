const express = require("express");
const {
  createPickup,
  getMyRequests,
  getPickupById,
  cancelPickup,
  getPendingPickups
} = require("../controllers/pickupController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { upload, usePickupPhotoFolder } = require("../middleware/uploadMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/", protect, allowRoles("customer"), usePickupPhotoFolder, upload.single("photo"), asyncHandler(createPickup));
router.get("/my-requests", protect, allowRoles("customer"), asyncHandler(getMyRequests));
router.get("/pending/all", protect, allowRoles("manager", "admin"), asyncHandler(getPendingPickups));
router.get("/:id", protect, allowRoles("customer", "driver", "manager", "admin"), asyncHandler(getPickupById));
router.put("/:id/cancel", protect, allowRoles("customer"), asyncHandler(cancelPickup));

module.exports = router;
