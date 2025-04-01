const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require("./routes/authRoutes");
const billRoutes = require("./routes/billRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const pool = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
}));

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/categories", categoryRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the Commons API!");
});


app.get("/api/auth/loginStatus", async (req, res) => {
  try {
    const userId = req.user.id; // assuming you're using JWT and the user ID is in the JWT token
    
    // Fetch the full user data from the database
    const user = await User.findById(userId);

    if (user) {
      // Return the user object with all necessary fields
      res.json({
        loggedIn: true,
        user: user, // Include all fields (email, id, name, username, etc.)
      });
    } else {
      res.json({
        loggedIn: false,
        user: null,
      });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.json({
      loggedIn: false,
      user: null,
    });
  }
});

app.get('/api/events/:billId', async (req, res) => {
  const { billId } = req.params;
  try {
    const query = 'SELECT * FROM events WHERE bill_id = $1';
    const result = await pool.query(query, [billId]);

    if (result.rows.length === 0) {
      return res.status(404).send('No events found for the given billId');
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Server error');
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


