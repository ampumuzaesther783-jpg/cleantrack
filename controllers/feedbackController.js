const pool = require("../config/db");

const createFeedback = async (req, res) => {
  const { pickup_request_id, rating, comment } = req.body;

  if (!/^\d+$/.test(String(pickup_request_id)) || !Number.isSafeInteger(Number(pickup_request_id))
    || Number(pickup_request_id) < 1 || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5
    || (comment != null && (typeof comment !== "string" || comment.length > 1000))) {
    return res.status(400).json({ message: "Choose a pickup and a rating from 1 to 5; comments must be at most 1000 characters" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[pickup]] = await connection.query(
      "SELECT id FROM pickup_requests WHERE id = ? AND customer_id = ? AND status = 'collected' FOR UPDATE",
      [pickup_request_id, req.user.id]
    );
    if (!pickup) {
      await connection.rollback();
      return res.status(403).json({ message: "You can only rate your own completed pickups" });
    }
    const [[existing]] = await connection.query("SELECT id FROM pickup_feedback WHERE pickup_request_id = ? LIMIT 1", [pickup.id]);
    if (existing) {
      await connection.rollback();
      return res.status(409).json({ message: "Feedback has already been submitted for this pickup" });
    }
    const [result] = await connection.query(
      "INSERT INTO pickup_feedback (pickup_request_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)",
      [pickup.id, req.user.id, Number(rating), comment?.trim() || null]
    );
    await connection.commit();
    res.status(201).json({ message: "Feedback saved", id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error("Could not save pickup feedback:", error.message);
    res.status(500).json({ message: "Could not save feedback" });
  } finally {
    connection.release();
  }
};

const getFeedbackByPickup = async (req, res) => {
  const params = [req.params.pickupId];
  let permission = "";
  if (req.user.role === "customer") {
    permission = "AND pf.customer_id = ?";
    params.push(req.user.id);
  } else if (req.user.role === "driver") {
    permission = "AND EXISTS (SELECT 1 FROM pickup_assignments pa WHERE pa.pickup_request_id = pf.pickup_request_id AND pa.driver_id = ?)";
    params.push(req.user.id);
  } else if (req.user.role === "manager") {
    permission = `AND EXISTS (SELECT 1 FROM pickup_assignments pa JOIN waste_companies wc ON wc.id = pa.company_id
                              WHERE pa.pickup_request_id = pf.pickup_request_id AND wc.manager_id = ?)`;
    params.push(req.user.id);
  }
  try {
    const [feedback] = await pool.query(
      `SELECT pf.*, u.full_name AS customer_name
       FROM pickup_feedback pf
       JOIN users u ON u.id = pf.customer_id
       WHERE pf.pickup_request_id = ? ${permission}`,
      params
    );
    res.json(feedback);
  } catch (error) {
    console.error("Could not load pickup feedback:", error.message);
    res.status(500).json({ message: "Could not load feedback" });
  }
};

module.exports = { createFeedback, getFeedbackByPickup };
