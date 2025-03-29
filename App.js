const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./src/routes/authRoutes");
const billRoutes = require("./src/routes/billRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const { Pool } = require("pg");

dotenv.config();


app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

app.locals.db = pool;

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/categories", categoryRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to the Commons API!");
});

module.exports = app;

