const express = require("express");
const router = express.Router();
const db = require("../db");
const Bill = require("../models/bill")(db);
const { classifyBills } = require("../services/billService");

// GET /api/bills — supports pagination + filters + categories
router.get("/", async (req, res) => {
  try {
    const {
      status = '',
      session = '',
      senateHouse = '',
      category = 0,
      limit = 50,
      offset = 0
    } = req.query;

    const values = [];
    const whereClauses = [];

    if (status) {
      values.push(status);
      whereClauses.push(`status = $${values.length}`);
    }

    if (session) {
      values.push(session);
      whereClauses.push(`session = $${values.length}`);
    }

    if (senateHouse) {
      values.push(senateHouse);
      whereClauses.push(`senate_house = $${values.length}`);
    }

    if (category && category !== "0") {
      values.push(parseInt(category));
      whereClauses.push(`$${values.length} = ANY(assigned_categories)`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Main bill query with pagination
    const billsQuery = `
      SELECT * FROM bills
      ${whereSQL}
      ORDER BY date DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;
    const billsResult = await db.query(billsQuery, [...values, parseInt(limit), parseInt(offset)]);

    // Total count of matching bills
    const countQuery = `
      SELECT COUNT(*) FROM bills
      ${whereSQL}
    `;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Also fetch categories
    const categoriesResult = await db.query("SELECT * FROM categories");

    res.json({
      bills: billsResult.rows,
      total,
      categories: categoriesResult.rows
    });

  } catch (error) {
    console.error("Error fetching bills with filters:", error);
    res.status(500).send("Error fetching filtered bills");
  }
});

// GET /api/bills/categorized — Classify bills with uClassify
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
