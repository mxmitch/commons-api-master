const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Import query function from db.js

// Fetch all bills from the database
router.get("/", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bills');
    
    // If no bills found, send an empty array
    if (result.rows.length === 0) {
      return res.json({ bills: [], categories: [] });
    }

    // Query categories (assuming you have a categories table)
    const categoriesResult = await pool.query('SELECT * FROM categories');
    
    res.json({ bills: result.rows, categories: categoriesResult.rows });
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).send("Error fetching bills");
  }
});

module.exports = router;


