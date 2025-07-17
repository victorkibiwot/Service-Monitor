const express = require('express');
const router = express.Router();
const { axiosInstance, axiosInstance2} = require('../utils/axios');
const qs = require('qs');
const validateToken = require('./middlewares/validateToken');


// login routes
router.get('/', (req, res) => {
  res.render('login', {
    csrfToken: req.csrfToken()
  });
});


router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try{
    const response = await axiosInstance.post('/login', 
      qs.stringify({username, password}),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

  
    const {token} = response.data;
    const cookies = response.headers['set-cookie'];
    let jsessionid = null;

    if (cookies) {
      const jsessionidCookie = cookies.find(cookie => cookie.includes('JSESSIONID'));
      if (jsessionidCookie) {
        jsessionid = jsessionidCookie.split(';')[0];
      }
    }

    if (!token || !jsessionid) {
      return res.json({ success: false, message: 'Missing auth token or session cookie.' });
    }

    // Store sesion in data
    req.session.token = token;
    req.session.jsessionid = jsessionid;

    // Save session before redirect
    req.session.save(err => {
      if (err) {
         return res.json({ success: false, message: 'Session save failed.' });
      }
      
      return res.json({
        success: true,
        message: 'Login successful!',
        redirect: '/dashboard'
      });
    });

  } catch (err) {
    console.error('Login failed:', err.response?.data || err);
    res.json({
      success: false,
      message: 'Invalid credentials. Please try again.'
    });
  }
});


// Logout route
router.get('/logout', (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  
  if (!token || !jsessionid) {
    return res.json({
            success: false,
            message: 'No active session to logout.',
            redirect: '/'
        });
  }

  req.session.destroy((err)=> {

    if (err) {
      return res.json({
                success: false,
                message: 'Failed to logout. Please try again.',
                redirect: '/'
            });
    }
    
    res.json({
    success: true,
    message: 'Logout successful, Bye!', 
    redirect: '/'});
  });
});


module.exports = router;