const express = require("express");
const { register, login, me } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(me));

module.exports = router;
