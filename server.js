const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// ✅ MySQL Database Connection
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

// ✅ Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT USER_Name, USER_Password FROM USER WHERE USER_Name = ?";
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

    const storedPassword = results[0].USER_Password;

    if (password === storedPassword) {
      req.session.user = username; // :white_check_mark: Store user in session
      return res.json({ success: true });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }
  });
});

// ✅ Dashboard Route (Protected)
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.json({ success: true, username: req.session.user });
});

// ✅ Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ✅ Start the Server
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);