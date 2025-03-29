const express = require('express');
const router = express.Router();
const pool = require('../db'); // assuming your PostgreSQL connection pool is exported from db.js

// Check if the user is logged in (simple session check or JWT check)
router.get("/logged_in", (req, res) => {
  // Example: Check if there's a user session or JWT token in cookies
  if (req.session.user) {
    res.json({ logged_in: true, user: req.session.user });
  } else {
    res.json({ logged_in: false });
  }
});

// Handle logout
router.delete("/logout", (req, res) => {
  // Destroy the user session or clear the JWT cookie
  req.session.destroy(() => {
    res.status(200).json({ message: "Logged out successfully" });
  });
});

module.exports = router;

