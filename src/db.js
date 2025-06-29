const { Pool } = require('pg');
const dotenv = require('dotenv');

// Initialize dotenv to load environment variables
require('dotenv').config();

// Create a new pool instance for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log("Using database URL:", process.env.DATABASE_URL);

// Function to execute queries
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res; // Return result
  } catch (err) {
    console.error('Error executing query', err.stack);
    throw err; // Propagate error to the caller
  }
};

module.exports = {
  pool,
  query
};
