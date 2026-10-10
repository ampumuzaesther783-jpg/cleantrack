const pool = require("../config/db");

const getCategories = async (req, res) => {
  const [categories] = await pool.query("SELECT * FROM waste_categories ORDER BY name ASC");
  res.json(categories);
};

const createCategory = async (req, res) => {
  const { name, description, status = "active" } = req.body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80
    || !["active", "inactive"].includes(status)
    || (description != null && (typeof description !== "string" || description.length > 2000))) {
    return res.status(400).json({ message: "Enter a category name, valid status, and description of at most 2000 characters" });
  }

  const [result] = await pool.query(
    "INSERT INTO waste_categories (name, description, status) VALUES (?, ?, ?)",
    [name.trim(), description?.trim() || null, status]
  );

  res.status(201).json({ message: "Waste category created", id: result.insertId });
};

const updateCategory = async (req, res) => {
  const { name, description, status } = req.body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80
    || !["active", "inactive"].includes(status)
    || (description != null && (typeof description !== "string" || description.length > 2000))) {
    return res.status(400).json({ message: "Enter a category name, valid status, and description of at most 2000 characters" });
  }
  const [result] = await pool.query(
    "UPDATE waste_categories SET name = ?, description = ?, status = ? WHERE id = ?",
    [name.trim(), description?.trim() || null, status, req.params.id]
  );

  if (!result.affectedRows) return res.status(404).json({ message: "Category not found" });
  res.json({ message: "Waste category updated" });
};

module.exports = { getCategories, createCategory, updateCategory };
