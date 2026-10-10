const pool = require("../config/db");
const { createNotification } = require("../utils/notificationService");
const isPositiveId = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

const getManagerCompanyId = async (managerId) => {
  const [companies] = await pool.query("SELECT id FROM waste_companies WHERE manager_id = ?", [managerId]);
  return companies[0]?.id;
};

const createAssignment = async (req, res) => {
  const { pickup_request_id, truck_id, driver_id } = req.body;
  const [companies] = await pool.query("SELECT id FROM waste_companies WHERE manager_id = ? AND status = 'active'", [req.user.id]);
  const companyId = companies[0]?.id;

  if (!companyId) return res.status(400).json({ message: "Create a company profile first" });
  if (!isPositiveId(pickup_request_id) || !isPositiveId(truck_id) || !isPositiveId(driver_id)) {
    return res.status(400).json({ message: "Pickup request, truck, and driver are required" });
  }

  const [trucks] = await pool.query(
    `SELECT t.id FROM trucks t JOIN users d ON d.id = t.driver_id
     WHERE t.id = ? AND t.company_id = ? AND t.status = 'active'
       AND t.driver_id = ? AND d.role = 'driver' AND d.status = 'active'`,
    [truck_id, companyId, driver_id]
  );
  if (!trucks.length) return res.status(400).json({ message: "Choose an active company truck assigned to the selected active driver" });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock the request first so concurrent managers cannot create duplicate assignments.
    const [[pickup]] = await connection.query(
      "SELECT customer_id FROM pickup_requests WHERE id = ? AND status = 'pending' FOR UPDATE",
      [pickup_request_id]
    );
    if (!pickup) {
      await connection.rollback();
      return res.status(409).json({ message: "Pickup request is not pending or does not exist" });
    }

    const [assignment] = await connection.query(
      `INSERT INTO pickup_assignments
       (pickup_request_id, company_id, truck_id, driver_id, assigned_by, status)
       VALUES (?, ?, ?, ?, ?, 'assigned')`,
      [pickup_request_id, companyId, truck_id, driver_id, req.user.id]
    );

    const [pickupUpdate] = await connection.query("UPDATE pickup_requests SET status = 'assigned' WHERE id = ? AND status = 'pending'", [
      pickup_request_id
    ]);

    if (!pickupUpdate.affectedRows) {
      throw new Error("Pickup request is not pending or does not exist");
    }

    await createNotification(connection, driver_id, "New pickup assigned", `Pickup #${pickup_request_id} has been assigned to you.`);
    await createNotification(connection, pickup.customer_id, "Pickup assigned", `Pickup #${pickup_request_id} has been assigned to a collection team.`);

    await connection.commit();
    res.status(201).json({ message: "Pickup assigned", id: assignment.insertId });
  } catch (error) {
    await connection.rollback();
    console.error("Could not assign pickup:", error.message);
    res.status(500).json({ message: "Could not assign pickup" });
  } finally {
    connection.release();
  }
};

const getDriverJobs = async (req, res) => {
  const [jobs] = await pool.query(
    `SELECT pa.*, pr.description, pr.urgency, pr.estimated_bin_level, pr.photo,
            wc.name AS waste_type, cl.location_name, cl.district, cl.address_details
     FROM pickup_assignments pa
     JOIN pickup_requests pr ON pr.id = pa.pickup_request_id
     JOIN waste_categories wc ON wc.id = pr.waste_category_id
     JOIN customer_locations cl ON cl.id = pr.location_id
     WHERE pa.driver_id = ?
     ORDER BY pa.assigned_at DESC`,
    [req.user.id]
  );
  res.json(jobs);
};

const getCompanyJobs = async (req, res) => {
  const companyId = await getManagerCompanyId(req.user.id);
  if (!companyId) return res.json([]);

  const [jobs] = await pool.query(
    `SELECT pa.*, pr.description, pr.urgency, pr.status AS pickup_status,
            wc.name AS waste_type, cl.location_name, cl.district,
            d.full_name AS driver_name, t.truck_number_plate
     FROM pickup_assignments pa
     JOIN pickup_requests pr ON pr.id = pa.pickup_request_id
     JOIN waste_categories wc ON wc.id = pr.waste_category_id
     JOIN customer_locations cl ON cl.id = pr.location_id
     JOIN users d ON d.id = pa.driver_id
     JOIN trucks t ON t.id = pa.truck_id
     WHERE pa.company_id = ?
     ORDER BY pa.assigned_at DESC`,
    [companyId]
  );
  res.json(jobs);
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["on_the_way"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[assignment]] = await connection.query(
      `SELECT pa.status, pr.id AS pickup_id, pr.customer_id
       FROM pickup_assignments pa JOIN pickup_requests pr ON pr.id = pa.pickup_request_id
       WHERE pa.id = ? AND pa.driver_id = ? FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!assignment) {
      await connection.rollback();
      return res.status(404).json({ message: "Assignment not found" });
    }
    if (assignment.status !== "assigned" && assignment.status !== "on_the_way") {
      await connection.rollback();
      return res.status(409).json({ message: "This pickup can no longer change status" });
    }
    await connection.query("UPDATE pickup_assignments SET status = ? WHERE id = ?", [status, req.params.id]);
    await connection.query("UPDATE pickup_requests SET status = ? WHERE id = ?", [status, assignment.pickup_id]);
    if (status !== assignment.status) await notifyCustomerStatus(connection, assignment, status);
    await connection.commit();
    res.json({ message: "Assignment status updated" });
  } catch (error) {
    await connection.rollback();
    console.error("Could not update assignment status:", error.message);
    res.status(500).json({ message: "Could not update assignment status" });
  } finally {
    connection.release();
  }
};

const notifyCustomerStatus = async (queryable, assignment, status) => {
  const messages = {
    on_the_way: ["Pickup team on the way", `The team is on the way for pickup #${assignment.pickup_id}.`],
    collected: ["Pickup collected", `Pickup #${assignment.pickup_id} has been collected.`],
    failed: ["Pickup could not be completed", `Pickup #${assignment.pickup_id} could not be completed.`]
  };
  const notification = messages[status];
  if (notification) await createNotification(queryable, assignment.customer_id, notification[0], notification[1]);
};

const completeAssignment = async (req, res) => {
  const { collection_notes, waste_quantity_collected } = req.body;
  if (collection_notes != null && (typeof collection_notes !== "string" || collection_notes.length > 2000)) {
    return res.status(400).json({ message: "Collection notes must be text of at most 2000 characters" });
  }
  if (waste_quantity_collected != null && waste_quantity_collected !== ""
    && (!Number.isFinite(Number(waste_quantity_collected)) || Number(waste_quantity_collected) < 0)) {
    return res.status(400).json({ message: "Waste quantity must be a non-negative number" });
  }
  const proofPhoto = req.file ? `/uploads/proof-photos/${req.file.filename}` : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[assignment]] = await connection.query(
      `SELECT pa.status, pr.id AS pickup_id, pr.customer_id FROM pickup_assignments pa
       JOIN pickup_requests pr ON pr.id = pa.pickup_request_id WHERE pa.id = ? AND pa.driver_id = ? FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!assignment) { await connection.rollback(); return res.status(404).json({ message: "Assignment not found" }); }
    if (!["assigned", "on_the_way"].includes(assignment.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Only an active pickup can be marked as collected" });
    }
    await connection.query(
      `UPDATE pickup_assignments SET status = 'collected', collection_notes = ?, waste_quantity_collected = ?,
       proof_photo = COALESCE(?, proof_photo), completed_at = NOW() WHERE id = ?`,
      [collection_notes?.trim() || null, waste_quantity_collected === "" ? null : waste_quantity_collected || null, proofPhoto, req.params.id]
    );
    await connection.query("UPDATE pickup_requests SET status = 'collected', completed_at = NOW() WHERE id = ?", [assignment.pickup_id]);
    if (assignment.status !== "collected") await notifyCustomerStatus(connection, assignment, "collected");
    await connection.commit();
    res.json({ message: "Pickup marked as collected" });
  } catch (error) {
    await connection.rollback();
    console.error("Could not complete assignment:", error.message);
    res.status(500).json({ message: "Could not complete assignment" });
  } finally { connection.release(); }
};

const failAssignment = async (req, res) => {
  const { failure_reason } = req.body;
  if (typeof failure_reason !== "string" || !failure_reason.trim() || failure_reason.trim().length > 2000) {
    return res.status(400).json({ message: "A failure reason of at most 2000 characters is required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[assignment]] = await connection.query(
      `SELECT pa.status, pr.id AS pickup_id, pr.customer_id FROM pickup_assignments pa
       JOIN pickup_requests pr ON pr.id = pa.pickup_request_id WHERE pa.id = ? AND pa.driver_id = ? FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!assignment) { await connection.rollback(); return res.status(404).json({ message: "Assignment not found" }); }
    if (!["assigned", "on_the_way"].includes(assignment.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Only an active pickup can be marked as failed" });
    }
    await connection.query(
      "UPDATE pickup_assignments SET status = 'failed', failure_reason = ?, completed_at = NOW() WHERE id = ?",
      [failure_reason.trim(), req.params.id]
    );
    await connection.query("UPDATE pickup_requests SET status = 'failed', completed_at = NOW() WHERE id = ?", [assignment.pickup_id]);
    if (assignment.status !== "failed") await notifyCustomerStatus(connection, assignment, "failed");
    await connection.commit();
    res.json({ message: "Pickup marked as failed" });
  } catch (error) {
    await connection.rollback();
    console.error("Could not fail assignment:", error.message);
    res.status(500).json({ message: "Could not update assignment" });
  } finally { connection.release(); }
};

module.exports = { createAssignment, getDriverJobs, getCompanyJobs, updateStatus, completeAssignment, failAssignment };
