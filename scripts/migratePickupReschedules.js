const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const migrate = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cleantrack_uganda",
    multipleStatements: true
  });

  try {
    const [scheduledForColumn] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'pickup_requests'
         AND COLUMN_NAME = 'scheduled_for'`
    );
    if (!scheduledForColumn.length) {
      await connection.query("ALTER TABLE pickup_requests ADD COLUMN scheduled_for DATETIME NULL AFTER requested_at");
    }

    const migrationPath = path.join(__dirname, "..", "database", "migrations", "002_pickup_reschedule_requests.sql");
    await connection.query(fs.readFileSync(migrationPath, "utf8"));
    console.log("Pickup reschedule migration applied.");
  } finally {
    await connection.end();
  }
};

migrate().catch((error) => {
  console.error("Pickup reschedule migration failed:", error.message);
  process.exit(1);
});
