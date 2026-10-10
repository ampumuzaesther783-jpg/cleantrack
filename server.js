const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const locationRoutes = require("./routes/locationRoutes");
const pickupRoutes = require("./routes/pickupRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const companyRoutes = require("./routes/companyRoutes");
const truckRoutes = require("./routes/truckRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const adminRoutes = require("./routes/adminRoutes");
const recurringScheduleRoutes = require("./routes/recurringScheduleRoutes");
const { startRecurringScheduleProcessor } = require("./services/recurringScheduleProcessor");
const pickupRescheduleRoutes = require("./routes/pickupRescheduleRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded photos are served as static files so the frontend can display them.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "CleanTrack Uganda API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/pickups", pickupRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recurring-schedules", recurringScheduleRoutes);
app.use("/api/pickup-reschedules", pickupRescheduleRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : err.name === "MulterError" ? 400 : 500);
  res.status(status).json({ message: status < 500 ? err.message : "Server error" });
});

app.listen(PORT, () => {
  console.log(`CleanTrack Uganda backend running on port ${PORT}`);
  startRecurringScheduleProcessor();
});
