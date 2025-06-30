const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require("./routes/authRoutes");
const billRoutes = require("./routes/billRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const findMpRoutes = require('./routes/findMpRoutes');
const pool = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ✅ Strict CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://commons-app.netlify.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ✅ JSON parsing middleware
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/findmp", findMpRoutes);
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ✅ Root check
app.get("/", (req, res) => {
  res.send("Welcome to the Commons API!");
});

// ✅ Event fetch route
app.get('/api/events/:billId', async (req, res) => {
  const { billId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM events WHERE bill_id = $1', [billId]);

    if (result.rows.length === 0) {
      return res.status(404).send('No events found for the given billId');
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Server error');
  }
});



// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Commons API running on port ${port}`);
});
