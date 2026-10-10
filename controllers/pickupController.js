const pool = require("../config/db");
const { createNotification } = require("../utils/notificationService");
const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

const createPickup = async (req, res) => {
  try {
    const { location_id, waste_category_id, description, urgency = "normal", estimated_bin_level } = req.body;

    if (!isPositiveInteger(location_id) || !isPositiveInteger(waste_category_id)
      || !Number.isInteger(Number(estimated_bin_level)) || Number(estimated_bin_level) < 1 || Number(estimated_bin_level) > 100
      || !["normal", "urgent"].includes(urgency)
      || (description != null && (typeof description !== "string" || description.length > 2000))) {
      return res.status(400).json({ message: "Location, waste type, and bin level are required" });
    }

    const [locations] = await pool.query(
      "SELECT id FROM customer_locations WHERE id = ? AND user_id = ?",
      [location_id, req.user.id]
    );

    if (!locations.length) {
      return res.status(403).json({ message: "You can only report bins for your own locations" });
    }
    const [categories] = await pool.query(
      "SELECT id FROM waste_categories WHERE id = ? AND status = 'active'",
      [waste_category_id]
    );
    if (!categories.length) return res.status(400).json({ message: "Select an active waste category" });

    const photo = req.file ? `/uploads/pickup-photos/${req.file.filename}` : null;

    // Pickup requests start as pending until a manager assigns a driver and truck.
    const connection = await pool.getConnection();
    let result;
    try {
      await connection.beginTransaction();
      [result] = await connection.query(
      `INSERT INTO pickup_requests
       (customer_id, location_id, waste_category_id, description, photo, urgency, estimated_bin_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, location_id, waste_category_id, description || null, photo, urgency, estimated_bin_level]
      );
      await createNotification(connection, req.user.id, "Pickup request received", `Your pickup request #${result.insertId} has been received.`);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({ message: "Pickup request created", id: result.insertId });
  } catch (error) {
    console.error("Could not create pickup request:", error.message);
    res.status(500).json({ message: "Could not create pickup request" });
  }
};

const getMyRequests = async (req, res) => {
  const [requests] = await pool.query(
    `SELECT pr.*, wc.name AS waste_type, cl.location_name, cl.district
     FROM pickup_requests pr
     JOIN waste_categories wc ON wc.id = pr.waste_category_id
     JOIN customer_locations cl ON cl.id = pr.location_id
     WHERE pr.customer_id = ?
     ORDER BY pr.created_at DESC`,
    [req.user.id]
  );
  res.json(requests);
};

const getPickupById = async (req, res) => {
  const params = [req.params.id];
  let ownerClause = "";

  if (req.user.role === "customer") {
    ownerClause = "AND pr.customer_id = ?";
    params.push(req.user.id);
  } else if (req.user.role === "driver") {
    ownerClause = "AND pa.driver_id = ?";
    params.push(req.user.id);
  } else if (req.user.role === "manager") {
    ownerClause = `AND (pr.status = 'pending' OR EXISTS (
      SELECT 1 FROM pickup_assignments scoped_pa
      JOIN waste_companies scoped_wc ON scoped_wc.id = scoped_pa.company_id
      WHERE scoped_pa.pickup_request_id = pr.id AND scoped_wc.manager_id = ?
    ))`;
    params.push(req.user.id);
  }

  const [requests] = await pool.query(
    `SELECT pr.*, wc.name AS waste_type, cl.location_name, cl.district, cl.address_details,
            pa.id AS assignment_id, pa.driver_id, pa.truck_id, pa.status AS assignment_status,
            pa.collection_notes, pa.failure_reason, pa.waste_quantity_collected, pa.proof_photo
     FROM pickup_requests pr
     JOIN waste_categories wc ON wc.id = pr.waste_category_id
     JOIN customer_locations cl ON cl.id = pr.location_id
     LEFT JOIN pickup_assignments pa ON pa.pickup_request_id = pr.id
     WHERE pr.id = ? ${ownerClause}`,
    params
  );

  if (!requests.length) return res.status(404).json({ message: "Pickup request not found" });
  res.json(requests[0]);
};

const cancelPickup = async (req, res) => {
  const [result] = await pool.query(
    "UPDATE pickup_requests SET status = 'cancelled' WHERE id = ? AND customer_id = ? AND status = 'pending'",
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) {
    return res.status(400).json({ message: "Only your pending pickup requests can be cancelled" });
  }
  res.json({ message: "Pickup request cancelled" });
};

const getPendingPickups = async (req, res) => {
  const [requests] = await pool.query(
    `SELECT pr.*, wc.name AS waste_type, cl.location_name, cl.district, cl.address_details, u.full_name AS customer_name
     FROM pickup_requests pr
     JOIN waste_categories wc ON wc.id = pr.waste_category_id
     JOIN customer_locations cl ON cl.id = pr.location_id
     JOIN users u ON u.id = pr.customer_id
     WHERE pr.status = 'pending'
     ORDER BY FIELD(pr.urgency, 'urgent', 'normal'), pr.created_at ASC`
  );
  res.json(requests);
};

module.exports = { createPickup, getMyRequests, getPickupById, cancelPickup, getPendingPickups };
