const express = require("express");
const {
  createAssignment,
  getDriverJobs,
  getCompanyJobs,
  updateStatus,
  completeAssignment,
  failAssignment
} = require("../controllers/assignmentController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { upload, useProofPhotoFolder } = require("../middleware/uploadMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/", protect, allowRoles("manager"), asyncHandler(createAssignment));
router.get("/driver/my-jobs", protect, allowRoles("driver"), asyncHandler(getDriverJobs));
router.get("/company/my-jobs", protect, allowRoles("manager"), asyncHandler(getCompanyJobs));
router.put("/:id/status", protect, allowRoles("driver"), asyncHandler(updateStatus));
router.put("/:id/complete", protect, allowRoles("driver"), useProofPhotoFolder, upload.single("proof_photo"), asyncHandler(completeAssignment));
router.put("/:id/failed", protect, allowRoles("driver"), asyncHandler(failAssignment));

module.exports = router;
