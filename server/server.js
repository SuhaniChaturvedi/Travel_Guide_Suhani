const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const initSqlJs = require("sql.js");

const app = express();
const PORT = process.env.PORT || 5001;

// ── Uploads directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ── Database helpers (sql.js – pure WASM, no native compile needed) ──────────
const DB_PATH = path.join(__dirname, "reviews.db");

let db; // in-memory sql.js DB instance

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      place      TEXT    NOT NULL,
      author     TEXT    NOT NULL,
      rating     INTEGER NOT NULL,
      comment    TEXT    NOT NULL,
      photo_url  TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  saveDb();
}

// ── Multer – store photos in /uploads ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed."));
    }
  },
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/reviews?place=<place-name>
 * Returns all reviews for the given place, newest first.
 */
app.get("/api/reviews", (req, res) => {
  const { place } = req.query;
  if (!place || place.trim() === "") {
    return res.status(400).json({ error: "Query param 'place' is required." });
  }

  const stmt = db.prepare(
    "SELECT id, author, rating, comment, photo_url, created_at FROM reviews WHERE place = ? ORDER BY created_at DESC"
  );
  stmt.bind([place.trim()]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  res.json(rows);
});

/**
 * POST /api/reviews
 * Body (multipart/form-data): place, author, rating, comment, photo (optional file)
 */
app.post("/api/reviews", upload.single("photo"), (req, res) => {
  const { place, author, rating, comment } = req.body;

  if (!place || !author || !rating || !comment) {
    return res
      .status(400)
      .json({ error: "place, author, rating and comment are required." });
  }

  
  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res
      .status(400)
      .json({ error: "rating must be an integer between 1 and 5." });
  }

  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    "INSERT INTO reviews (place, author, rating, comment, photo_url) VALUES (?, ?, ?, ?, ?)",
    [place.trim(), author.trim(), ratingNum, comment.trim(), photoUrl]
  );
  saveDb();

  // Return the new row id
  const result = db.exec("SELECT last_insert_rowid() AS id");
  const id = result[0].values[0][0];

  res.status(201).json({ id });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: "Internal server error." });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`TripVerse API running on http://127.0.0.1:${PORT}`);
  });
});
