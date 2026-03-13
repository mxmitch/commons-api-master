const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes = require("./routes/authRoutes");
const billRoutes = require("./routes/billRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const findMpRoutes = require('./routes/findMpRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const pool = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
app.set('trust proxy', 1);

app.use(helmet());
app.use(cookieParser());

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

app.use(express.json());

// Separate limiters for login vs register
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again later.'
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window for registration
  max: 5,
  message: 'Too many registration attempts. Try again later.'
});

// Apply per-route limiters instead of a blanket one on /api/auth
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/bills', billRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/findmp', findMpRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.get("/", (req, res) => {
  res.send("Welcome to the Commons API!");
});

app.get('/api/events/:billId', async (req, res) => {
  const { billId } = req.params;
  const normalizedBillId = billId.trim().toLowerCase();

  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE LOWER(bill_id) = $1',
      [normalizedBillId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Commons API running on port ${port}`);
});