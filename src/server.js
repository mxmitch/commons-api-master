const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require("./routes/authRoutes");
const billRoutes = require("./routes/billRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


