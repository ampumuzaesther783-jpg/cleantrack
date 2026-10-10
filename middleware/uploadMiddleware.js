const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || "pickup-photos";
    cb(null, path.join(__dirname, "..", "uploads", folder));
  },
  filename: (req, file, cb) => {
    const extensionByMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp" };
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionByMime[file.mimetype]}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error("Upload a JPEG, PNG, GIF, or WebP image"), { status: 400 }), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }
});

const usePickupPhotoFolder = (req, res, next) => {
  req.uploadFolder = "pickup-photos";
  next();
};

const useProofPhotoFolder = (req, res, next) => {
  req.uploadFolder = "proof-photos";
  next();
};

module.exports = { upload, usePickupPhotoFolder, useProofPhotoFolder };
