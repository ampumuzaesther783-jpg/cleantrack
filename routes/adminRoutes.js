const express = require("express");
const {
  getStats,
  getUsers,
  getPickups,
  getCompanies,
  getTrucks,
  updateUserStatus
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.use(protect, allowRoles("admin"));

router.get("/stats", asyncHandler(getStats));
router.get("/users", asyncHandler(getUsers));
router.get("/pickups", asyncHandler(getPickups));
router.get("/companies", asyncHandler(getCompanies));
router.get("/trucks", asyncHandler(getTrucks));
router.put("/users/:id/status", asyncHandler(updateUserStatus));

module.exports = router;
