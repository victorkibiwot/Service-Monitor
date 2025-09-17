const express = require('express');
const router = express.Router();
const { axiosInstance, axiosInstance2, axiosInstance3, axiosInstance4} = require('../utils/axios');
const pool = require('../db');
const axios = require('axios');
const validateToken = require('./middlewares/validateToken');

// Render the dashboard
router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// Render the transaction monitor with dummy data
router.get('/transactions', (req, res) => {
  res.render('transactions');
});

// Render the sessions page (initial shell, data fetched client-side)
router.get('/sessions', (req, res) => {
  try {
    res.render("sessions", {
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error rendering sessions page:', error.message);
    res.status(500).json({ code: 500, error: 'Failed to render sessions page' });
  }
});

// Proxy endpoint to get inactive session data
router.get('/api/inactive-sessions', async (req, res) => {
  try {
    const response = await axiosInstance3.get('/api/getInactiveSessionData');
    const { inactive_user_sessions, total_inactive_sessions, time, code = 200 } = response.data;

    res.json({
      code,
      inactive_user_sessions,
      total_inactive_sessions,
      time
    });
  } catch (error) {
    console.error('Error fetching inactive sessions:', error.message);
    res.status(500).json({ code: 500, error: 'Failed to fetch inactive sessions' });
  }
});

// API route to return latest transaction info
router.get('/api/latest-sequence', async (req, res) => {
  try {
    const response = await axiosInstance3.get('/api/getLatestSequence');
    const { latest_sequence, daily_transactions, time, code = 200 } = response.data;

    res.json({
      code,
      latest_sequence,
      daily_transactions,
      time
    });
  } catch (error) {
    console.error('Error fetching latest sequence:', error.message);
    res.status(500).json({ code: 500, error: 'Failed to fetch latest sequence' });
  }
});


// API route to return last half hour sequence of transactions
router.get('/api/history', async (req, res) => {
  try {
    const response = await axiosInstance3.get('/api/getTransactionData');
    const {code = 200, time, transactions} = response.data;

    if (!Array.isArray(transactions)) {
      return res.status(500).json({ code: 500, error: 'Invalid data format from upstream API' });
    }

    res.json({
      code,
      time,
      transactions
    });
    
  } catch (error) {
    console.error('Error fetching latest sequence:', error.message);
    res.status(500).json({ code: 500, error: 'Failed to fetch latest sequence' });
  }
});


//Requests for kplc data
router.get('/getSingleKplcTransactionData', async (req, res) => {
  try {
    const response = await axiosInstance3.get('/api/getSingleKplcTransactionData');
    const data = response.data;

    res.json(data);
  } catch (error) {
    console.error('Error fetching latest kplc transaction:', error.message);
    res.status(500).json({ code: 500, error: 'Failed to fetch latest transaction' });
  }
});


// API route to return last half hour sequence of transactions
router.get('/getKplcTransactionData', async (req, res) => {
  try {
    const response = await axiosInstance3.get('/api/getKplcTransactionData');
    const data = response.data;

    res.json(data);
    
  } catch (error) {
    console.error('Error fetching KPLC history:', error.message);
    res.status(500).json({ code: 500, error: 'Failed to fetch history' });
  }
});

// Get all services
router.get('/services', validateToken, async (req, res) => {
  const { env } = req.query;

  try {
    let result;
    if (env && ['live', 'test'].includes(env)) {
      result = await pool.query('SELECT * FROM services WHERE env = $1 ORDER BY id ASC', [env]);
    } else {
      result = await pool.query('SELECT * FROM services ORDER BY id ASC');
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new service
router.post('/api/services', validateToken, async (req, res) => {
  const { name, endpoint, env = 'live' } = req.body;
  if (!name || !endpoint) {
    return res.status(400).json({ error: 'Name and endpoint are required' });
  }

  if (!['live', 'test'].includes(env)) {
    return res.status(400).json({ error: 'Invalid env value' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO services (name, endpoint, env) VALUES ($1, $2, $3) RETURNING *',
      [name, endpoint, env]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update existing service
router.put('/api/services/:name', validateToken, async (req, res) => {
  const originalName = req.params.name;
  const { name: updatedName, endpoint: updatedEndpoint } = req.body;

  if (!updatedName || !updatedEndpoint) {
    return res.status(400).json({ error: 'Name and endpoint are required' });
  }

  try {
    // Check if the updated name or endpoint already exists in another record
    const duplicateCheck = await pool.query(
      'SELECT * FROM services WHERE (name = $1 OR endpoint = $2) AND name != $3',
      [updatedName, updatedEndpoint, originalName]
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({ error: 'Service name or endpoint already exists' });
    }

    // Proceed with update
    const result = await pool.query(
      'UPDATE services SET name = $1, endpoint = $2 WHERE name = $3 RETURNING *',
      [updatedName, updatedEndpoint, originalName]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Delete a service
router.delete('/api/services/:name', validateToken, async (req, res) => {
  const name = req.params.name;

  try {
    const result = await pool.query(
      'DELETE FROM services WHERE name = $1 RETURNING *',
      [name]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ message: `Service "${name}" deleted.` });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// Ping services and update status
router.get('/api/services/ping', validateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services');
    const services = result.rows;

    for (const service of services) {
      try {
        const ping = await axios.get(service.endpoint, { timeout: 5000 });
        const status = (ping.status === 200 && ping.data.status === 'UP') ? 'up' : 'down';
        await pool.query(
          'UPDATE services SET status = $1, last_checked = NOW() WHERE id = $2',
          [status, service.id]
        );
      } catch (err) {
        await pool.query(
          'UPDATE services SET status = $1, last_checked = NOW() WHERE id = $2',
          ['down', service.id]
        );
      }
    }

    const updated = await pool.query('SELECT * FROM services ORDER BY id ASC');
    res.json(updated.rows);
  } catch (err) {
    console.error('Error pinging services:', err);
    res.status(500).json({ error: 'Ping error' });
  }
});


module.exports = router;