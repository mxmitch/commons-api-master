const express = require('express');
const router = express.Router();
const { query } = require('../db'); // Import query function from db.js

// Fetch all categories from the database
router.get("/", async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories');
    res.json(result.rows); // Send categories data to frontend
  } catch (error) {
    console.error("Error fetching categories: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
