const express = require("express");
const router = express.Router();
const db = require("../db"); // Ensure this correctly initializes your database connection
const Bill = require("../models/bill")(db);
const { classifyBills } = require('../services/billService'); // Import the classifyBills function

// Fetch all bills from the database
router.get("/", async (req, res) => {
  try {
    const bills = await Bill.getAll();
    
    // Fetch categories (assuming a Category model or direct query)
    const categoriesResult = await db.query("SELECT * FROM categories");

    res.json({ bills, categories: categoriesResult.rows });
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).send("Error fetching bills");
  }
});

router.get('/categorized', async (req, res) => {
  try {
    const results = await classifyBills();
    res.json({ message: "Classification complete", results });
  } catch (err) {
    console.error("Error classifying bills:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

