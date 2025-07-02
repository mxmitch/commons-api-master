const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const pool = require('../db');
const User = require("../models/user");
const authMiddleware = require('../middleware/authMiddleware');
const cookieParser = require('cookie-parser'); // 
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again later.'
});


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables.");
}

router.use(cookieParser()); // ✅ required to read/write cookies

// ✅ Login Route - use httpOnly cookie
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // ✅ Set secure httpOnly cookie instead of returning token in JSON
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // only in prod
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // ✅ Return safe user object only
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        email_notification: user.email_notification,
        sms_notification: user.sms_notification,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Logout Route — clear cookie
router.delete('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// ✅ Authenticated Check Route (optional but useful)
router.get("/check-auth", (req, res) => {
  const token = req.cookies.token;
  console.log("🔍 Cookie token:", req.cookies.token);

  if (!token) {
    return res.status(401).json({ loggedIn: false, user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ loggedIn: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ loggedIn: false, user: null });
  }
});

module.exports = router;
