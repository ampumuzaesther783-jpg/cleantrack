const express = require("express");
const { createCompany, getMyCompany, updateCompany } = require("../controllers/companyController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.use(protect, allowRoles("manager"));

router.post("/", asyncHandler(createCompany));
router.get("/my-company", asyncHandler(getMyCompany));
router.put("/:id", asyncHandler(updateCompany));

module.exports = router;
