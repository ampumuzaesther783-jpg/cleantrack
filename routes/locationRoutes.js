const express = require("express");
const {
  createLocation,
  getMyLocations,
  getLocationById,
  updateLocation,
  deleteLocation
} = require("../controllers/locationController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.use(protect, allowRoles("customer"));

router.post("/", asyncHandler(createLocation));
router.get("/my-locations", asyncHandler(getMyLocations));
router.get("/:id", asyncHandler(getLocationById));
router.put("/:id", asyncHandler(updateLocation));
router.delete("/:id", asyncHandler(deleteLocation));

module.exports = router;
