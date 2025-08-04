// db.js - Einfache PostgreSQL Verbindung
const { Pool } = require("pg");
require("dotenv").config();

// Verbindungspool erstellen
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  // Zusätzliche Optionen für Render
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test-Verbindung
pool.connect((err, client, release) => {
  if (err) {
    console.error("Datenbankverbindung fehlgeschlagen:", err);
  } else {
    console.log("Datenbankverbindung erfolgreich");
    release();
  }
});

module.exports = pool;
