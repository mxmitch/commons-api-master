const express = require("express");
const router = express.Router();
const db = require("../db");
const Bill = require("../models/bill")(db);
const { classifyBills } = require("../services/billService");
const authMiddleware = require("../middleware/authMiddleware");

// 🔓 GET /api/bills — supports filters, pagination, categories
router.get("/", async (req, res) => {
  try {
    const {
      status = '',
      session = '',
      senateHouse = '',
      category = "0",
      limit = 50,
      offset = 0
    } = req.query;
    
    // ✅ Use a separate array for filtering values
    const filterValues = [];
    const whereClauses = [];

    if (status === 'passed') {
      whereClauses.push(`received_royal_assent_date IS NOT NULL`);
    }
    if (status === 'active') {
      whereClauses.push(`received_royal_assent_date IS NULL`);
    }

    if (senateHouse) {
      filterValues.push(senateHouse);
      whereClauses.push(`senate_house = $${filterValues.length}`);
    }

    if (category && category !== "0") {
      filterValues.push(category);
      whereClauses.push(`$${filterValues.length} = ANY(assigned_categories)`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 🔍 Log filter input
    console.log("📦 Filters:", { status, session, senateHouse, category });
    console.log("🔍 WHERE SQL:", whereSQL);
    console.log("🔧 Filter values:", filterValues);

    // ✅ Main query with pagination
    const billsQuery = `
  SELECT * FROM bills
  ${whereSQL}
  ORDER BY
    LEFT(bill_number, 1),
    CAST(SUBSTRING(bill_number FROM '\\d+') AS INT)
  LIMIT $${filterValues.length + 1}
  OFFSET $${filterValues.length + 2}
`;
    const billsResult = await db.query(
      billsQuery,
      [...filterValues, parseInt(limit), parseInt(offset)]
    );

    // ✅ Accurate count query
    const countQuery = `SELECT COUNT(*) FROM bills ${whereSQL}`;
    const countResult = await db.query(countQuery, filterValues);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);


    const categoriesResult = await db.query("SELECT * FROM categories");

    res.json({
      bills: billsResult.rows,
      total,
      categories: categoriesResult.rows
    });

  } catch (error) {
    console.error("❌ Error fetching bills with filters:", error);
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
