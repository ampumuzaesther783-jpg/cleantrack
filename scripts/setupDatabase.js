const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const runSqlFile = async (connection, fileName) => {
  const filePath = path.join(__dirname, "..", "database", fileName);
  const sql = fs.readFileSync(filePath, "utf8");
  await connection.query(sql);
};

const setupDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true
  });

  await runSqlFile(connection, "schema.sql");
  await runSqlFile(connection, "seed.sql");
  await connection.end();

  console.log("CleanTrack Uganda database schema and seed data loaded.");
};

setupDatabase().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
