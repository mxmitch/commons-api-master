const express = require("express");
const router = express.Router();
const db = require("../db");
const Bill = require("../models/bill")(db);
const { classifyBills } = require("../services/billService");
const authMiddleware = require("../middleware/authMiddleware"); // 🔐 Import JWT middleware

// 🔓 GET /api/bills — supports filters, pagination, categories
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

    const billsQuery = `
      SELECT * FROM bills
      ${whereSQL}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;
    const billsResult = await db.query(billsQuery, [...values, parseInt(limit), parseInt(offset)]);

    const countQuery = `SELECT COUNT(*) FROM bills ${whereSQL}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

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

// 🔓 GET /api/bills/categorized — Classify bills (public)
router.get("/categorized", async (req, res) => {
  try {
    const results = await classifyBills();
    res.json({ message: "Classification complete", results });
  } catch (err) {
    console.error("Error classifying bills:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🔒 POST /api/bills/:id/watch — Add to user's watchlist
router.post("/:id/watch", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const billId = req.params.id;

  try {
    await db.query(
      'INSERT INTO watchlist (user_id, bill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, billId]
    );
    res.status(200).json({ message: "Added to watchlist" });
  } catch (err) {
    console.error("Watchlist error:", err);
    res.status(500).json({ error: "Could not add to watchlist" });
  }
});

module.exports = router;
