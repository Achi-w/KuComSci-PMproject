const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 3000;

// -------------------------
// Middleware
// -------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Prevent caching of protected pages
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------
// Session Setup
// -------------------------
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// -------------------------
// MySQL Database Connection (using pmdatabase4)
// -------------------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "pmdatabase4",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.message);
  } else {
    console.log("Connected to MySQL database.");
  }
});

// -------------------------
// Login / Dashboard / Logout Routes
// -------------------------

// Login Route – fetch full user record including USER_ID
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const query =
    "SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Password FROM USER WHERE USER_Name = ?";
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("Database query error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    if (results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
    const user = results[0];
    if (password === user.USER_Password) {
      // Store the full user record in session
      req.session.user = user;
      return res.json({ success: true });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  });
});

// Dashboard Route – returns logged‑in user (as "user")
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.json({ success: true, user: req.session.user });
});

// Logout Route – destroys the session
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// -------------------------
// Announcement Endpoints
// -------------------------

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure "uploads" folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /user/:id – used if needed by announcement.js
app.get("/user/:id", (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT USER_ID, USER_Name, USER_Surname, USER_Role, USER_Year, USER_Contact_DETAIL 
    FROM USER 
    WHERE USER_ID = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(results[0]);
  });
});

// GET /announcements – return all announcements sorted by date DESC
app.get("/announcements", (req, res) => {
  const sql = `
    SELECT 
      Announcement_ID as id,
      USER_ID as user_id,
      USER_Name as first_name,
      USER_Surname as last_name,
      USER_Role as role,
      Announcement_Detail as detail,
      DATE_FORMAT(Announcement_Start_Date, '%Y-%m-%d') as date,
      Announcement_Headline as headline
    FROM announcement
    ORDER BY Announcement_Start_Date DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST /upload – handle image upload
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No file uploaded" });
  const imageUrl = req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename;
  res.json({ imageUrl });
});

// POST /deleteImage – delete an uploaded image file
app.post("/deleteImage", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl)
    return res.status(400).json({ error: "No image URL provided" });
  const baseUrl = req.protocol + "://" + req.get("host") + "/";
  const filePath = imageUrl.replace(baseUrl, "");
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).json({ error: "Error deleting file" });
    }
    res.json({ message: "File deleted successfully" });
  });
});

// POST /announcements – create a new announcement
app.post("/announcements", (req, res) => {
  const { author, user_name, user_surname, user_role, date, headline, detail } = req.body;
  if (user_role.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to create announcements." });
  }
  const announcementId = uuidv4().replace(/-/g, "").substring(0, 20);
  const sqlInsert = `
    INSERT INTO announcement 
      (Announcement_ID, USER_ID, USER_Name, USER_Surname, USER_Role, Announcement_Detail, Announcement_Start_Date, Announcement_Headline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sqlInsert, [announcementId, author, user_name, user_surname, user_role, detail, date, headline], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const sqlSelect = `
      SELECT 
        Announcement_ID as id,
        USER_ID as user_id,
        USER_Name as first_name,
        USER_Surname as last_name,
        USER_Role as role,
        Announcement_Detail as detail,
        DATE_FORMAT(Announcement_Start_Date, '%Y-%m-%d') as date,
        Announcement_Headline as headline
      FROM announcement
      WHERE Announcement_ID = ?`;
    db.query(sqlSelect, [announcementId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0)
        return res.status(404).json({ error: "Announcement not found" });
      res.status(201).json(rows[0]);
    });
  });
});

// PUT /announcements/:id – update an announcement
app.put("/announcements/:id", (req, res) => {
  const id = req.params.id;
  const { headline, detail, currentUserId, currentUserRole } = req.body;
  if (currentUserRole.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to update announcements." });
  }
  db.query("SELECT USER_ID FROM announcement WHERE Announcement_ID = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    const announcementUserId = rows[0].USER_ID;
    if (currentUserId !== announcementUserId) {
      return res.status(403).json({ error: "Not authorized to update this announcement" });
    }
    const sqlUpdate = `
      UPDATE announcement
      SET Announcement_Headline = ?, Announcement_Detail = ?
      WHERE Announcement_ID = ?`;
    db.query(sqlUpdate, [headline, detail, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const sqlSelect = `
        SELECT 
          Announcement_ID as id,
          USER_ID as user_id,
          USER_Name as first_name,
          USER_Surname as last_name,
          USER_Role as role,
          Announcement_Detail as detail,
          DATE_FORMAT(Announcement_Start_Date, '%Y-%m-%d') as date,
          Announcement_Headline as headline
        FROM announcement
        WHERE Announcement_ID = ?`;
      db.query(sqlSelect, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
        res.json(rows[0]);
      });
    });
  });
});

// DELETE /announcements/:id – delete an announcement and its referenced images
app.delete("/announcements/:id", (req, res) => {
  const id = req.params.id;
  const { currentUserId, currentUserRole } = req.body;
  if (currentUserRole.toLowerCase() === "student") {
    return res.status(403).json({ error: "Students are not allowed to delete announcements." });
  }
  const sqlSelect = `SELECT USER_ID, Announcement_Detail as detail FROM announcement WHERE Announcement_ID = ?`;
  db.query(sqlSelect, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    const announcementUserId = rows[0].USER_ID;
    if (currentUserId !== announcementUserId) {
      return res.status(403).json({ error: "Not authorized to delete this announcement" });
    }
    const detail = rows[0].detail;
    const regex = /<img\s+[^>]*src=['"]([^'"]+)['"]/gi;
    let match;
    while ((match = regex.exec(detail)) !== null) {
      const imageUrl = match[1];
      const filePath = imageUrl.replace(req.protocol + "://" + req.get("host") + "/", "");
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    const sqlDelete = `DELETE FROM announcement WHERE Announcement_ID = ?`;
    db.query(sqlDelete, [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Announcement not found" });
      res.json({ message: "Announcement deleted successfully" });
    });
  });
});

// -------------------------
// Start the Server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
