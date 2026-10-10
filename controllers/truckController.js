const pool = require("../config/db");

const getManagerCompanyId = async (managerId) => {
  const [companies] = await pool.query("SELECT id FROM waste_companies WHERE manager_id = ?", [managerId]);
  return companies[0]?.id;
};

const validStatuses = ["active", "maintenance", "inactive"];
const validateTruck = ({ truck_number_plate, truck_capacity, status }) => {
  if (typeof truck_number_plate !== "string" || !truck_number_plate.trim() || truck_number_plate.trim().length > 40) {
    return "Enter a truck number plate of at most 40 characters";
  }
  if (status != null && !validStatuses.includes(status)) return "Invalid truck status";
  if (truck_capacity != null && truck_capacity !== ""
    && (!Number.isFinite(Number(truck_capacity)) || Number(truck_capacity) <= 0)) return "Truck capacity must be a positive number";
  return null;
};

const validateDriver = async (driverId) => {
  if (driverId == null || driverId === "") return true;
  const [drivers] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'driver' AND status = 'active'", [driverId]);
  return drivers.length > 0;
};

const createTruck = async (req, res) => {
  const { truck_number_plate, truck_capacity, driver_id, status = "active" } = req.body;
  const validationMessage = validateTruck({ truck_number_plate, truck_capacity, status });
  if (validationMessage) return res.status(400).json({ message: validationMessage });
  if (!(await validateDriver(driver_id))) return res.status(400).json({ message: "Select an active driver account" });
  const companyId = await getManagerCompanyId(req.user.id);

  if (!companyId) return res.status(400).json({ message: "Create a company profile first" });
  if (!truck_number_plate) return res.status(400).json({ message: "Truck number plate is required" });

  const [result] = await pool.query(
    "INSERT INTO trucks (company_id, truck_number_plate, truck_capacity, driver_id, status) VALUES (?, ?, ?, ?, ?)",
    [companyId, truck_number_plate.trim(), truck_capacity || null, driver_id || null, status]
  );

  res.status(201).json({ message: "Truck created", id: result.insertId });
};

const getCompanyTrucks = async (req, res) => {
  const companyId = await getManagerCompanyId(req.user.id);
  if (!companyId) return res.json([]);

  const [trucks] = await pool.query(
    `SELECT t.*, u.full_name AS driver_name
     FROM trucks t
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE t.company_id = ?
     ORDER BY t.created_at DESC`,
    [companyId]
  );
  res.json(trucks);
};

const updateTruck = async (req, res) => {
  const { truck_number_plate, truck_capacity, driver_id, status = "active" } = req.body;
  const validationMessage = validateTruck({ truck_number_plate, truck_capacity, status });
  if (validationMessage) return res.status(400).json({ message: validationMessage });
  if (!(await validateDriver(driver_id))) return res.status(400).json({ message: "Select an active driver account" });
  const companyId = await getManagerCompanyId(req.user.id);

  const [result] = await pool.query(
    `UPDATE trucks
     SET truck_number_plate = ?, truck_capacity = ?, driver_id = ?, status = ?
     WHERE id = ? AND company_id = ?`,
    [truck_number_plate.trim(), truck_capacity || null, driver_id || null, status, req.params.id, companyId]
  );

  if (!result.affectedRows) return res.status(404).json({ message: "Truck not found" });
  res.json({ message: "Truck updated" });
};

const deleteTruck = async (req, res) => {
  const companyId = await getManagerCompanyId(req.user.id);
  try {
    const [result] = await pool.query("DELETE FROM trucks WHERE id = ? AND company_id = ?", [req.params.id, companyId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Truck not found" });
    res.json({ message: "Truck deleted" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ message: "This truck has pickup assignment history and cannot be deleted" });
    }
    console.error("Could not delete truck:", error.message);
    res.status(500).json({ message: "Could not delete truck" });
  }
};

module.exports = { createTruck, getCompanyTrucks, updateTruck, deleteTruck };
