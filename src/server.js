const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require("./routes/authRoutes");
const billRoutes = require("./routes/billRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

// Initialize dotenv
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for your frontend URL
// Enable CORS for your frontend URL
app.use(cors({
  origin: 'http://localhost:3000',  // React app URL (adjust for your environment)
  methods: 'GET,POST,PUT,DELETE',  // Allow these HTTP methods
  allowedHeaders: 'Content-Type,Authorization',  // Allow these headers
  credentials: true  // Allow credentials (cookies)
}));

const session = require('express-session');

// Add session middleware before your routes
app.use(
  session({
    secret: 'your-secret-key', // Choose a secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to `true` in production with HTTPS
  })
);


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/categories", categoryRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to the Commons API!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


