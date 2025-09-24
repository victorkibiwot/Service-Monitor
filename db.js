require('dotenv').config();
const { Pool } = require('pg');
require("./logger"); // Require the logger utility to store the logs

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ,
    ssl: { rejectUnauthorized: false } // Required for Neon
});

// Ensure services table exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        endpoint TEXT NOT NULL,
        status VARCHAR(10) DEFAULT 'unknown',
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // add column if not exists
    await pool.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS env VARCHAR(10) DEFAULT 'live' CHECK (env IN ('live', 'test'));
    `);

    console.log("✅ services table ready");
  } catch (err) {
    console.error("❌ Failed to initialize services table:", err);
  }
})();

module.exports = pool; 
