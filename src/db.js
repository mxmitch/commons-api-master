const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is missing');
}

console.log('🧠 DB connecting to:', process.env.DATABASE_URL.split('@')[1]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // 🔥 Render Postgres requires SSL
  ssl: {
    rejectUnauthorized: false,
  },

  // 🔥 IMPORTANT: keep pool tiny for Render stability
  max: 1,
  min: 0,

  // 🔥 prevents stale / half-dead connections
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 30000,

  // 🔥 avoids keep-alive weirdness on Render
  keepAlive: false,
});

// 🔥 hard fail visibility
pool.on('error', (err) => {
  console.error('🔥 Unexpected PG pool error:', err.message);
});

async function query(text, params) {
  const client = await pool.connect();

  try {
    return await client.query(text, params);
  } catch (err) {
    console.error('❌ DB query error:', err.message);
    throw err;
  } finally {
    // forcefully release bad sockets (important for Render instability)
    client.release(true);
  }
}

// graceful shutdown (prevents zombie connections)
async function closePool() {
  await pool.end();
  console.log('🛑 DB pool closed');
}

module.exports = {
  query,
  pool,
  closePool,
};