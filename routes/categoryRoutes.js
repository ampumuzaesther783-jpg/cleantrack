const express = require("express");
const { getCategories, createCategory, updateCategory } = require("../controllers/categoryController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", protect, asyncHandler(getCategories));
router.post("/", protect, allowRoles("admin"), asyncHandler(createCategory));
router.put("/:id", protect, allowRoles("admin"), asyncHandler(updateCategory));

module.exports = router;
