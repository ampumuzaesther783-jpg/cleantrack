const pool = require("../config/db");
const { createNotification } = require("../utils/notificationService");

const validDecisions = ["approved", "rejected"];
const isValidId = (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

const getUgandaDateTime = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Kampala",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

const isValidRequestedFor = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  const [datePart] = value.split("T");
  const date = new Date(`${datePart}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === datePart
    && value > getUgandaDateTime();
};

const validateRequest = (body = {}) => {
  if (!isValidId(body.pickup_request_id)) return "Select a valid pickup request";
  if (!isValidRequestedFor(body.requested_for)) return "Choose a valid future date and time";
  if (body.reason != null && (typeof body.reason !== "string" || body.reason.trim().length > 1000)) {
    return "Reason must be text with at most 1000 characters";
  }
  return null;
};

const requestReschedule = async (req, res) => {
  const validationMessage = validateRequest(req.body);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[pickup]] = await connection.query(
      `SELECT id, status, customer_id,
              DATE_FORMAT(scheduled_for, '%Y-%m-%dT%H:%i') AS scheduled_for
       FROM pickup_requests WHERE id = ? AND customer_id = ? FOR UPDATE`,
      [req.body.pickup_request_id, req.user.id]
    );
    if (!pickup) {
      await connection.rollback();
      return res.status(404).json({ message: "Eligible pickup not found" });
    }
    if (pickup.status !== "assigned") {
      await connection.rollback();
      return res.status(409).json({ message: "Only assigned pickups can be rescheduled" });
    }
    if (pickup.scheduled_for && pickup.scheduled_for === req.body.requested_for) {
      await connection.rollback();
      return res.status(400).json({ message: "Choose a different date and time" });
    }

    const [[assignment]] = await connection.query(
      `SELECT pa.company_id, wc.manager_id
       FROM pickup_assignments pa
       JOIN waste_companies wc ON wc.id = pa.company_id AND wc.status = 'active'
       WHERE pa.pickup_request_id = ? AND pa.status = 'assigned'
       ORDER BY pa.assigned_at DESC LIMIT 1`,
      [pickup.id]
    );
    if (!assignment) {
      await connection.rollback();
      return res.status(409).json({ message: "This pickup has no active company assignment" });
    }

    const [[pendingRequest]] = await connection.query(
      "SELECT id FROM pickup_reschedule_requests WHERE pickup_request_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE",
      [pickup.id]
    );
    if (pendingRequest) {
      await connection.rollback();
      return res.status(409).json({ message: "A reschedule request is already pending for this pickup" });
    }

    const [result] = await connection.query(
      `INSERT INTO pickup_reschedule_requests
       (pickup_request_id, customer_id, company_id, requested_for, customer_reason)
       VALUES (?, ?, ?, ?, ?)`,
      [
        pickup.id,
        req.user.id,
        assignment.company_id,
        `${req.body.requested_for.replace("T", " ")}:00`,
        req.body.reason?.trim() || null
      ]
    );

    await createNotification(
      connection,
      assignment.manager_id,
      "Pickup reschedule requested",
      `A customer requested a new date and time for pickup #${pickup.id}.`
    );
    await connection.commit();
    res.status(201).json({ message: "Reschedule request submitted", id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error("Could not submit pickup reschedule:", error.message);
    res.status(500).json({ message: "Could not submit reschedule request" });
  } finally {
    connection.release();
  }
};

const getEligiblePickups = async (req, res) => {
  try {
    const [pickups] = await pool.query(
      `SELECT DISTINCT pr.id, pr.status, pr.urgency,
              DATE_FORMAT(pr.scheduled_for, '%Y-%m-%dT%H:%i') AS scheduled_for,
              cl.location_name, cl.district, wc.name AS waste_type
       FROM pickup_requests pr
       JOIN customer_locations cl ON cl.id = pr.location_id
       JOIN waste_categories wc ON wc.id = pr.waste_category_id
       JOIN pickup_assignments pa ON pa.pickup_request_id = pr.id AND pa.status = 'assigned'
       JOIN waste_companies company ON company.id = pa.company_id AND company.status = 'active'
       WHERE pr.customer_id = ? AND pr.status = 'assigned'
         AND NOT EXISTS (
           SELECT 1 FROM pickup_reschedule_requests rr
           WHERE rr.pickup_request_id = pr.id AND rr.status = 'pending'
         )
       ORDER BY pr.scheduled_for, pr.created_at DESC`,
      [req.user.id]
    );
    res.json(pickups);
  } catch (error) {
    console.error("Could not load eligible pickups:", error.message);
    res.status(500).json({ message: "Could not load eligible pickups" });
  }
};

const getMyRequests = async (req, res) => {
  if (req.query.pickup_request_id && !isValidId(req.query.pickup_request_id)) {
    return res.status(400).json({ message: "Invalid pickup request ID" });
  }
  try {
    const params = [req.user.id];
    let pickupFilter = "";
    if (req.query.pickup_request_id) {
      pickupFilter = " AND rr.pickup_request_id = ?";
      params.push(req.query.pickup_request_id);
    }
    const [requests] = await pool.query(
      `SELECT rr.id, rr.pickup_request_id,
              DATE_FORMAT(rr.requested_for, '%Y-%m-%dT%H:%i') AS requested_for, rr.customer_reason,
              rr.status, rr.manager_response, rr.reviewed_at, rr.created_at,
              pr.status AS pickup_status,
              DATE_FORMAT(pr.scheduled_for, '%Y-%m-%dT%H:%i') AS scheduled_for,
              cl.location_name, cl.district
       FROM pickup_reschedule_requests rr
       JOIN pickup_requests pr ON pr.id = rr.pickup_request_id
       JOIN customer_locations cl ON cl.id = pr.location_id
       WHERE rr.customer_id = ?${pickupFilter}
       ORDER BY rr.created_at DESC`,
      params
    );
    res.json(requests);
  } catch (error) {
    console.error("Could not load reschedule requests:", error.message);
    res.status(500).json({ message: "Could not load reschedule requests" });
  }
};

const getManagerPendingRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT rr.id, rr.pickup_request_id, rr.customer_id,
              DATE_FORMAT(rr.requested_for, '%Y-%m-%dT%H:%i') AS requested_for,
              rr.customer_reason, rr.created_at, rr.company_id,
              pr.status AS pickup_status,
              DATE_FORMAT(pr.scheduled_for, '%Y-%m-%dT%H:%i') AS scheduled_for,
              customer.full_name AS customer_name,
              cl.location_name, cl.district, wc.name AS waste_type,
              company.company_name
       FROM pickup_reschedule_requests rr
       JOIN pickup_requests pr ON pr.id = rr.pickup_request_id
       JOIN users customer ON customer.id = rr.customer_id
       JOIN customer_locations cl ON cl.id = pr.location_id
       JOIN waste_categories wc ON wc.id = pr.waste_category_id
       JOIN waste_companies company ON company.id = rr.company_id AND company.manager_id = ?
       WHERE rr.status = 'pending'
         AND EXISTS (
           SELECT 1 FROM pickup_assignments pa
           WHERE pa.pickup_request_id = rr.pickup_request_id
             AND pa.company_id = rr.company_id
         )
       ORDER BY rr.created_at ASC`,
      [req.user.id]
    );
    res.json(requests);
  } catch (error) {
    console.error("Could not load manager reschedule requests:", error.message);
    res.status(500).json({ message: "Could not load pending reschedule requests" });
  }
};

const decideRequest = async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid reschedule request ID" });
  const { status, response = "" } = req.body || {};
  if (!validDecisions.includes(status)) return res.status(400).json({ message: "Decision must be approved or rejected" });
  if (typeof response !== "string" || response.trim().length > 1000) {
    return res.status(400).json({ message: "Response must be text with at most 1000 characters" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[request]] = await connection.query(
      `SELECT id, pickup_request_id, customer_id, company_id,
              DATE_FORMAT(requested_for, '%Y-%m-%d %H:%i:%s') AS requested_for, status
       FROM pickup_reschedule_requests WHERE id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ message: "Reschedule request not found" });
    }
    if (request.status !== "pending") {
      await connection.rollback();
      return res.status(409).json({ message: "This reschedule request has already been decided" });
    }

    const [[company]] = await connection.query(
      "SELECT id FROM waste_companies WHERE id = ? AND manager_id = ?",
      [request.company_id, req.user.id]
    );
    const [[assignment]] = await connection.query(
      "SELECT id FROM pickup_assignments WHERE pickup_request_id = ? AND company_id = ? LIMIT 1",
      [request.pickup_request_id, request.company_id]
    );
    if (!company || !assignment) {
      await connection.rollback();
      return res.status(404).json({ message: "Reschedule request not found" });
    }

    const [[pickup]] = await connection.query(
      "SELECT id, status FROM pickup_requests WHERE id = ? FOR UPDATE",
      [request.pickup_request_id]
    );
    if (!pickup) {
      await connection.rollback();
      return res.status(404).json({ message: "Pickup request not found" });
    }
    if (status === "approved" && pickup.status !== "assigned") {
      await connection.rollback();
      return res.status(409).json({ message: "Only an assigned pickup can be rescheduled" });
    }

    if (status === "approved") {
      await connection.query(
        "UPDATE pickup_requests SET scheduled_for = ? WHERE id = ? AND status = 'assigned'",
        [request.requested_for, pickup.id]
      );
    }
    await connection.query(
      `UPDATE pickup_reschedule_requests
       SET status = ?, reviewed_by = ?, manager_response = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [status, req.user.id, response.trim() || null, request.id]
    );
    await createNotification(
      connection,
      request.customer_id,
      status === "approved" ? "Pickup reschedule approved" : "Pickup reschedule rejected",
      status === "approved"
        ? `Your requested date and time for pickup #${pickup.id} was approved.`
        : `Your reschedule request for pickup #${pickup.id} was rejected.${response.trim() ? ` Manager response: ${response.trim()}` : ""}`
    );

    await connection.commit();
    res.json({ message: `Reschedule request ${status}` });
  } catch (error) {
    await connection.rollback();
    console.error("Could not process reschedule request:", error.message);
    res.status(500).json({ message: "Could not process reschedule request" });
  } finally {
    connection.release();
  }
};

module.exports = {
  requestReschedule,
  getEligiblePickups,
  getMyRequests,
  getManagerPendingRequests,
  decideRequest,
  validateRequest,
  isValidRequestedFor
};
