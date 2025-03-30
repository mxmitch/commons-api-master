const express = require("express");
const router = express.Router();
const db = require("../db"); // Ensure this correctly initializes your database connection
const Bill = require("../models/bill")(db);

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

module.exports = router;

