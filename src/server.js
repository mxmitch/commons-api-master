const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

const authRoutes = require("./routes/authRoutes");
const billRoutes = require("./routes/billRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const findMpRoutes = require('./routes/findMpRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const pool = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ✅ Secure HTTP headers
app.use(helmet());

// ✅ Strict CORS
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

// ✅ JSON parser
app.use(express.json());

// ✅ Rate limit login/signup to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: 'Too many requests from this IP. Try again later.'
});
app.use('/api/auth', authLimiter, authRoutes);

// 🔐 Protect all other API routes
app.use('/api/bills', billRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/findmp', authMiddleware, findMpRoutes);

// ✅ Fallback for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ✅ Public root
app.get("/", (req, res) => {
  res.send("Welcome to the Commons API!");
});

// 🔐 Example of protected resource: events
app.get('/api/events/:billId', authMiddleware, async (req, res) => {
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
