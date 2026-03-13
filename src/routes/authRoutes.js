const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const cookieParser = require('cookie-parser');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables.");
}

router.use(cookieParser());

// Cookie config — cross-origin safe (Netlify frontend + Render backend)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 24 * 60 * 60 * 1000,
};

// ── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const {
    name, username, email, password,
    phone_number, postal_code, email_notification, sms_notification,
  } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Name, username, email and password are required.' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
  }

  try {
    const dupCheck = await pool.query(
      'SELECT email, username FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (dupCheck.rows.length > 0) {
      const dup = dupCheck.rows[0];
      if (dup.email === email) return res.status(409).json({ error: 'An account with that email already exists.' });
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, username, email, password, phone_number, postal_code, email_notification, sms_notification)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, name, username, email, phone_number, postal_code, email_notification, sms_notification`,
      [name, username, email, hashedPassword, phone_number || null, postal_code || null, email_notification ?? false, sms_notification ?? false]
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, cookieOptions);
    res.status(201).json({ message: 'Registration successful', user: newUser });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length > 72) {
    return res.status(400).json({ message: 'Invalid request.' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, cookieOptions);
    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, username: user.username, email: user.email, phone_number: user.phone_number, email_notification: user.email_notification, sms_notification: user.sms_notification }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Logout ──────────────────────────────────────────────────────────────────
router.delete('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions);
  res.status(200).json({ message: 'Logged out successfully' });
});

// ── Auth check ──────────────────────────────────────────────────────────────
router.get('/check-auth', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ loggedIn: false, user: null });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ loggedIn: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ loggedIn: false, user: null });
  }
});

module.exports = router;