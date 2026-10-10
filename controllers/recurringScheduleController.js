const pool = require("../config/db");

const validFrequencies = ["weekly", "biweekly"];
const validStatuses = ["active", "inactive"];

const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const isValidId = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

const getUgandaDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const isValidTime = (value) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

const getNextPickupDate = (startDate, preferredDay) => {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  const targetDay = Number(preferredDay) % 7;
  const daysUntilPreferred = (targetDay - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilPreferred);
  return date.toISOString().slice(0, 10);
};

const validateSchedule = (body = {}) => {
  const { location_id, waste_category_id, frequency, preferred_day, preferred_time, start_date } = body;
  if (!isPositiveInteger(location_id)) return "Select a valid pickup location";
  if (!isPositiveInteger(waste_category_id)) return "Select a valid waste category";
  if (!validFrequencies.includes(frequency)) return "Frequency must be weekly or biweekly";
  if (!Number.isInteger(Number(preferred_day)) || Number(preferred_day) < 1 || Number(preferred_day) > 7) {
    return "Preferred day must be between 1 (Monday) and 7 (Sunday)";
  }
  if (!isValidTime(preferred_time)) return "Enter a valid preferred time";
  if (!isValidDate(start_date)) return "Enter a valid start date";
  if (start_date < getUgandaDate()) return "Start date cannot be in the past";
  return null;
};

const getOwnedLocationAndCategory = async (customerId, locationId, categoryId) => {
  const [[locations], [categories]] = await Promise.all([
    pool.query("SELECT id FROM customer_locations WHERE id = ? AND user_id = ?", [locationId, customerId]),
    pool.query("SELECT id FROM waste_categories WHERE id = ? AND status = 'active'", [categoryId])
  ]);
  return { locationExists: locations.length > 0, categoryExists: categories.length > 0 };
};

const createSchedule = async (req, res) => {
  const validationMessage = validateSchedule(req.body);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  try {
    const { location_id, waste_category_id, frequency, preferred_day, preferred_time, start_date } = req.body;
    const { locationExists, categoryExists } = await getOwnedLocationAndCategory(req.user.id, location_id, waste_category_id);
    if (!locationExists) return res.status(403).json({ message: "You can only schedule pickups at your own locations" });
    if (!categoryExists) return res.status(400).json({ message: "Select an active waste category" });

    const nextPickupDate = getNextPickupDate(start_date, preferred_day);
    const [result] = await pool.query(
      `INSERT INTO recurring_pickup_schedules
       (customer_id, location_id, waste_category_id, frequency, preferred_day, preferred_time, start_date, next_pickup_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, location_id, waste_category_id, frequency, preferred_day, preferred_time, start_date, nextPickupDate]
    );

    res.status(201).json({ message: "Recurring pickup schedule created", id: result.insertId });
  } catch (error) {
    console.error("Could not create recurring schedule:", error.message);
    res.status(500).json({ message: "Could not create recurring schedule" });
  }
};

const getMySchedules = async (req, res) => {
  try {
    const [schedules] = await pool.query(
      `SELECT s.*,
              DATE_FORMAT(s.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(s.next_pickup_date, '%Y-%m-%d') AS next_pickup_date,
              cl.location_name, cl.district, wc.name AS waste_category,
              (SELECT COUNT(*) FROM recurring_pickup_occurrences o WHERE o.schedule_id = s.id) AS generated_pickups
       FROM recurring_pickup_schedules s
       JOIN customer_locations cl ON cl.id = s.location_id
       JOIN waste_categories wc ON wc.id = s.waste_category_id
       WHERE s.customer_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(schedules);
  } catch (error) {
    console.error("Could not load recurring schedules:", error.message);
    res.status(500).json({ message: "Could not load recurring schedules" });
  }
};

const updateSchedule = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid schedule ID" });
  const validationMessage = validateSchedule(req.body);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  try {
    const { location_id, waste_category_id, frequency, preferred_day, preferred_time, start_date } = req.body;
    const { locationExists, categoryExists } = await getOwnedLocationAndCategory(req.user.id, location_id, waste_category_id);
    if (!locationExists) return res.status(403).json({ message: "You can only schedule pickups at your own locations" });
    if (!categoryExists) return res.status(400).json({ message: "Select an active waste category" });

    const nextPickupDate = getNextPickupDate(start_date, preferred_day);
    const [[existing]] = await pool.query(
      "SELECT id FROM recurring_pickup_schedules WHERE id = ? AND customer_id = ?",
      [req.params.id, req.user.id]
    );
    if (!existing) return res.status(404).json({ message: "Schedule not found" });

    const [result] = await pool.query(
      `UPDATE recurring_pickup_schedules
       SET location_id = ?, waste_category_id = ?, frequency = ?, preferred_day = ?,
           preferred_time = ?, start_date = ?, next_pickup_date = ?
       WHERE id = ? AND customer_id = ?`,
      [location_id, waste_category_id, frequency, preferred_day, preferred_time, start_date, nextPickupDate, req.params.id, req.user.id]
    );
    if (!result.affectedRows) {
      const [[stillExists]] = await pool.query(
        "SELECT id FROM recurring_pickup_schedules WHERE id = ? AND customer_id = ?",
        [req.params.id, req.user.id]
      );
      if (!stillExists) return res.status(404).json({ message: "Schedule not found" });
    }
    res.json({ message: "Recurring pickup schedule updated" });
  } catch (error) {
    console.error("Could not update recurring schedule:", error.message);
    res.status(500).json({ message: "Could not update recurring schedule" });
  }
};

const updateScheduleStatus = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid schedule ID" });
  const { status } = req.body || {};
  if (!validStatuses.includes(status)) return res.status(400).json({ message: "Status must be active or inactive" });

  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM recurring_pickup_schedules WHERE id = ? AND customer_id = ?",
      [req.params.id, req.user.id]
    );
    if (!existing) return res.status(404).json({ message: "Schedule not found" });

    await pool.query(
      "UPDATE recurring_pickup_schedules SET status = ? WHERE id = ? AND customer_id = ?",
      [status, req.params.id, req.user.id]
    );
    res.json({ message: `Schedule ${status === "active" ? "activated" : "deactivated"}` });
  } catch (error) {
    console.error("Could not update recurring schedule status:", error.message);
    res.status(500).json({ message: "Could not update schedule status" });
  }
};

const deleteSchedule = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid schedule ID" });
  try {
    const [[schedule]] = await pool.query(
      "SELECT id FROM recurring_pickup_schedules WHERE id = ? AND customer_id = ?",
      [req.params.id, req.user.id]
    );
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const [[occurrences]] = await pool.query(
      "SELECT COUNT(*) AS count FROM recurring_pickup_occurrences WHERE schedule_id = ?",
      [schedule.id]
    );
    if (occurrences.count > 0) {
      return res.status(409).json({ message: "This schedule has generated pickups. Deactivate it to preserve its history." });
    }

    await pool.query("DELETE FROM recurring_pickup_schedules WHERE id = ? AND customer_id = ?", [schedule.id, req.user.id]);
    res.json({ message: "Recurring pickup schedule deleted" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ message: "This schedule has generated pickups. Deactivate it to preserve its history." });
    }
    console.error("Could not delete recurring schedule:", error.message);
    res.status(500).json({ message: "Could not delete recurring schedule" });
  }
};

module.exports = {
  createSchedule,
  getMySchedules,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
  validateSchedule,
  getNextPickupDate
};
