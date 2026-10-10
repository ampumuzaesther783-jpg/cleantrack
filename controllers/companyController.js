const pool = require("../config/db");

const createCompany = async (req, res) => {
  try {
    const { company_name, phone, email, district, address } = req.body;

    if (typeof company_name !== "string" || !company_name.trim() || company_name.trim().length > 150
      || typeof district !== "string" || !district.trim() || district.trim().length > 80
      || (email && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))) {
      return res.status(400).json({ message: "Enter a company name, district, and valid email" });
    }

    const [existing] = await pool.query("SELECT id FROM waste_companies WHERE manager_id = ?", [req.user.id]);
    if (existing.length) {
      return res.status(409).json({ message: "This manager already has a company profile" });
    }

    const [result] = await pool.query(
      "INSERT INTO waste_companies (manager_id, company_name, phone, email, district, address) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.id, company_name.trim(), phone || null, email ? email.trim().toLowerCase() : null, district.trim(), address || null]
    );

    res.status(201).json({ message: "Company profile created", id: result.insertId });
  } catch (error) {
    console.error("Could not create company:", error.message);
    res.status(500).json({ message: "Could not create company" });
  }
};

const getMyCompany = async (req, res) => {
  const [companies] = await pool.query("SELECT * FROM waste_companies WHERE manager_id = ?", [req.user.id]);
  if (!companies.length) return res.status(404).json({ message: "Company profile not found" });
  res.json(companies[0]);
};

const updateCompany = async (req, res) => {
  const { company_name, phone, email, district, address } = req.body;
  if (typeof company_name !== "string" || !company_name.trim() || company_name.trim().length > 150
    || typeof district !== "string" || !district.trim() || district.trim().length > 80
    || (email && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))) {
    return res.status(400).json({ message: "Enter a company name, district, and valid email" });
  }
  const [result] = await pool.query(
    `UPDATE waste_companies
     SET company_name = ?, phone = ?, email = ?, district = ?, address = ?
     WHERE id = ? AND manager_id = ?`,
    [company_name.trim(), phone || null, email ? email.trim().toLowerCase() : null, district.trim(), address || null, req.params.id, req.user.id]
  );

  if (!result.affectedRows) return res.status(404).json({ message: "Company not found" });
  res.json({ message: "Company updated" });
};

module.exports = { createCompany, getMyCompany, updateCompany };
