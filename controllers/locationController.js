const pool = require("../config/db");

const validLocationTypes = ["home", "business", "school", "market_stall", "institution"];
const validateLocation = (body = {}) => {
  const { location_name, location_type, district, latitude, longitude } = body;
  if (typeof location_name !== "string" || !location_name.trim() || location_name.trim().length > 120) return "Location name is required and must be at most 120 characters";
  if (!validLocationTypes.includes(location_type)) return "Select a valid location type";
  if (typeof district !== "string" || !district.trim() || district.trim().length > 80) return "District is required and must be at most 80 characters";
  if ((latitude === "") !== (longitude === "")) return "Enter both latitude and longitude, or leave both blank";
  if (latitude != null && latitude !== "" && (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) return "Latitude must be between -90 and 90";
  if (longitude != null && longitude !== "" && (!Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) return "Longitude must be between -180 and 180";
  return null;
};

const createLocation = async (req, res) => {
  try {
    const {
      location_name,
      location_type,
      district,
      division_or_subcounty,
      parish,
      village_or_zone,
      address_details,
      latitude,
      longitude
    } = req.body;

    const validationMessage = validateLocation(req.body);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    // The logged-in user's id becomes user_id, so customers cannot create locations for others.
    const [result] = await pool.query(
      `INSERT INTO customer_locations
       (user_id, location_name, location_type, district, division_or_subcounty, parish, village_or_zone, address_details, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        location_name.trim(),
        location_type,
        district.trim(),
        division_or_subcounty || null,
        parish || null,
        village_or_zone || null,
        address_details || null,
        latitude || null,
        longitude || null
      ]
    );

    res.status(201).json({ message: "Location created", id: result.insertId });
  } catch (error) {
    console.error("Could not create location:", error.message);
    res.status(500).json({ message: "Could not create location" });
  }
};

const getMyLocations = async (req, res) => {
  const [locations] = await pool.query(
    "SELECT * FROM customer_locations WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(locations);
};

const getLocationById = async (req, res) => {
  const [locations] = await pool.query(
    "SELECT * FROM customer_locations WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  if (!locations.length) return res.status(404).json({ message: "Location not found" });
  res.json(locations[0]);
};

const updateLocation = async (req, res) => {
  const {
    location_name,
    location_type,
    district,
    division_or_subcounty,
    parish,
    village_or_zone,
    address_details,
    latitude,
    longitude
  } = req.body;

  const validationMessage = validateLocation(req.body);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  const [result] = await pool.query(
    `UPDATE customer_locations
     SET location_name = ?, location_type = ?, district = ?, division_or_subcounty = ?, parish = ?,
         village_or_zone = ?, address_details = ?, latitude = ?, longitude = ?
     WHERE id = ? AND user_id = ?`,
    [
      location_name.trim(),
      location_type,
      district.trim(),
      division_or_subcounty || null,
      parish || null,
      village_or_zone || null,
      address_details || null,
      latitude || null,
      longitude || null,
      req.params.id,
      req.user.id
    ]
  );

  if (!result.affectedRows) return res.status(404).json({ message: "Location not found" });
  res.json({ message: "Location updated" });
};

const deleteLocation = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM customer_locations WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Location not found" });
    res.json({ message: "Location deleted" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ message: "This location is used by pickups or recurring schedules and cannot be deleted" });
    }
    console.error("Could not delete location:", error.message);
    res.status(500).json({ message: "Could not delete location" });
  }
};

module.exports = { createLocation, getMyLocations, getLocationById, updateLocation, deleteLocation };
