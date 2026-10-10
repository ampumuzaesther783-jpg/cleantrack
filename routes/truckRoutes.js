const express = require("express");
const { createTruck, getCompanyTrucks, updateTruck, deleteTruck } = require("../controllers/truckController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.use(protect, allowRoles("manager"));

router.post("/", asyncHandler(createTruck));
router.get("/company", asyncHandler(getCompanyTrucks));
router.put("/:id", asyncHandler(updateTruck));
router.delete("/:id", asyncHandler(deleteTruck));

module.exports = router;
