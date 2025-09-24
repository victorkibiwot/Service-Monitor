const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
const csrf = require('csurf');
const pool = require('./db');
const pgSession = require('connect-pg-simple')(session);
require('dotenv').config();
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const authRoutes = require('./routes/authRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
require("./logger"); // Require the logger utility to store the logs


app.use(cookieParser());

// Use session middleware before csrf with postgresql 
app.use(session({
    store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 60 * 60 * 1000 } 
}));

app.use(flash());

// Parse form data
app.use(express.urlencoded({ extended: false })); 
app.use(express.json()); 

// CSRF middleware (secure login)
app.use(csrf());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//making flash available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Routes
app.use(authRoutes);
app.use(monitorRoutes);



// Start http server
app.listen(3001, () => {
  console.log('✅ HTTP server running at http://localhost:3001');
});

