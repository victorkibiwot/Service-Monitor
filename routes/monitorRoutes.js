const express = require('express');
const router = express.Router();
const { axiosInstance, axiosInstance2} = require('../utils/axios');
const pool = require('../db');
const axios = require('axios');
const validateToken = require('./middlewares/validateToken');

// Render the dashboard
router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// Get all services
router.get('/services', validateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new service
router.post('/api/services', validateToken, async (req, res) => {
  const { name, endpoint } = req.body;
  if (!name || !endpoint) {
    return res.status(400).json({ error: 'Name and endpoint are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO services (name, endpoint) VALUES ($1, $2) RETURNING *',
      [name, endpoint]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding service:', err);
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