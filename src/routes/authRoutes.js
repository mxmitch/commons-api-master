const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Make sure this points to your PostgreSQL connection
const dotenv = require('dotenv');
const User = require("../models/user");
dotenv.config(); // Load environment variables

// Secret key for JWT (can be stored in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Compare passwords
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email },  // Payload (user data)
      JWT_SECRET, // Secret key to sign the JWT
      { expiresIn: '1h' } // Expiration time
    );

    // Return the token and user data (omit password)
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

// Register a new user
router.post("/register", async (req, res) => {
  const { username, email, password, phone_number, postal_code, email_notification, sms_notification } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password, phone_number, postal_code, email_notification, sms_notification) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [username, email, hashedPassword, phone_number, postal_code, email_notification, sms_notification]
    );

    res.status(201).json(newUser.rows[0]);  // Respond with the new user data
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout Route - Not necessary for JWT but keeping for consistency
router.delete('/logout', (req, res) => {
  // Since JWT is stateless, there’s no need to destroy the session
  res.status(200).send({ message: 'Logged out successfully' });
});

// Check login status route
router.get("/loginStatus", async (req, res) => {
  try {
    const userId = req.user.id; // assuming you're using JWT and the user ID is in the JWT token

    // Fetch the full user data from the database
    const user = await User.findById(userId);

    if (user) {
      // Return the user object with all necessary fields
      res.json({
        loggedIn: true,
        user: user, // Include all fields (email, id, name, username, etc.)
      });
    } else {
      res.json({
        loggedIn: false,
        user: null,
      });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.json({
      loggedIn: false,
      user: null,
    });
  }
});

module.exports = router;
