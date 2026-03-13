const express = require("express");
const router = express.Router();
const db = require("../db");
const Bill = require("../models/bill")(db);
const { classifyBills } = require("../services/billService");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/bills — supports filters, pagination
router.get("/", async (req, res) => {
  try {
    const {
      status = '',
      session = '',
      senateHouse = '',
      category = '0',
      limit = 50,
      offset = 0,
    } = req.query;

    const filterValues = [];
    const whereClauses = [];

    if (status === 'passed') {
      whereClauses.push(`received_royal_assent_date IS NOT NULL`);
    }
    if (status === 'active') {
      whereClauses.push(`received_royal_assent_date IS NULL`);
    }

    // Chamber is encoded in bill_number prefix: "S-" = senate, "C-" = commons
    if (senateHouse === 'senate') {
      whereClauses.push(`bill_number LIKE 'S-%'`);
    } else if (senateHouse === 'commons') {
      whereClauses.push(`bill_number LIKE 'C-%'`);
    }

    if (session) {
      filterValues.push(session);
      whereClauses.push(`parl_session_code = $${filterValues.length}`);
    }

    if (category && category !== '0') {
      filterValues.push(category);
      whereClauses.push(`$${filterValues.length} = ANY(assigned_categories)`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

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

    const countQuery = `SELECT COUNT(*) FROM bills ${whereSQL}`;
    const countResult = await db.query(countQuery, filterValues);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      bills: billsResult.rows,
      total,
    });

  } catch (error) {
    console.error("Error fetching bills with filters:", error);
    res.status(500).send("Error fetching filtered bills");
  }
});

// GET /api/bills/categorized — trigger classification (public)
router.get("/categorized", async (req, res) => {
  try {
    const results = await classifyBills();
    res.json({ message: "Classification complete", results });
  } catch (err) {
    console.error("Error classifying bills:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/bills/:id/watch — add to watchlist (protected)
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