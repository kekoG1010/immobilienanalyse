// server.js - Minimaler Express Server
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 Stunden
  })
);

// Hilfsfunktion: Login prüfen
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ROUTEN

// Home-Seite
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Login-Seite anzeigen
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Login verarbeiten
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.redirect("/login?error=1");
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.redirect("/login?error=1");
    }

    req.session.userId = user.id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login-Fehler:", error);
    res.redirect("/login?error=1");
  }
});

// Registrierung anzeigen
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

// Registrierung verarbeiten
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
      [email, hashedPassword]
    );

    res.redirect("/login?registered=1");
  } catch (error) {
    console.error("Registrierungsfehler:", error);
    res.redirect("/register?error=1");
  }
});

// Dashboard
app.get("/dashboard", requireLogin, async (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

// API: Suchaufträge abrufen
app.get("/api/suchauftraege", requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM suchauftraege WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Fehler beim Abrufen:", error);
    res.status(500).json({ error: "Serverfehler" });
  }
});

// API: Neuen Suchauftrag erstellen
app.post("/api/suchauftrag", requireLogin, async (req, res) => {
  const { plz, stadt, strasse, hausnummer } = req.body;

  const adresse = {
    plz,
    stadt,
    strasse,
    hausnummer,
  };

  try {
    await pool.query(
      "INSERT INTO suchauftraege (user_id, adresse) VALUES ($1, $2)",
      [req.session.userId, JSON.stringify(adresse)]
    );
    res.redirect("/?success=1");
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    res.redirect("/?error=1");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Server starten
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
