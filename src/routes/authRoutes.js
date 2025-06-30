const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const pool = require('../db');
const User = require("../models/user");
const authMiddleware = require('../middleware/authMiddleware');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables.");
}

// ✅ Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Compare passwords safely
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, user.password);
    } catch (err) {
      console.error("Password comparison error:", err);
    }

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return token + safe user object
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        email_notification: user.email_notification,
        sms_notification: user.sms_notification,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Register Route
router.post("/register", async (req, res) => {
  const {
    username,
    email,
    password,
    phone_number,
    postal_code,
    email_notification,
    sms_notification
  } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required" });
  }

  try {
    // Prevent duplicate registration
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password, phone_number, postal_code, email_notification, sms_notification) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [username, email, hashedPassword, phone_number, postal_code, email_notification, sms_notification]
    );

    const user = newUser.rows[0];
    delete user.password;

    res.status(201).json(user);

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Protected Logout Route (optional)
router.delete('/logout', authMiddleware, (req, res) => {
  // For stateless JWT, no action required
  res.status(200).send({ message: 'Logged out successfully' });
});

// ✅ Protected Login Status Route
router.get("/loginStatus", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findById(userId);
    if (user) {
      res.json({ loggedIn: true, user });
    } else {
      res.json({ loggedIn: false, user: null });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ loggedIn: false, user: null });
  }
});

module.exports = router;
