require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trip_ledger';
const SESSION_SECRET = process.env.SESSION_SECRET || 'trip_ledger_super_secret_key_2026_xyz';
const IS_PROD = process.env.NODE_ENV === 'production';

// Render runs behind a reverse proxy (enables secure cookies over HTTPS)
app.set('trust proxy', 1);

// Security Headers with Helmet (CSP disabled to allow inline handlers, Tailwind CDN, and OCR scripts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// High limit for base64 bill screenshots and receipt photos
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Rate limit for authentication attempts to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 25 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Seed or sync admin user from environment variables
async function seedDefaultAdmin() {
  try {
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        username: adminUsername,
        passwordHash,
        role: 'admin'
      });
      console.log(`✅ Default admin account created: username "${adminUsername}"`);
    } else {
      // Sync username if different
      let needsSave = false;
      if (admin.username !== adminUsername) {
        admin.username = adminUsername;
        needsSave = true;
      }
      // Check if password was changed in env
      const match = await bcrypt.compare(adminPassword, admin.passwordHash);
      if (!match) {
        admin.passwordHash = await bcrypt.hash(adminPassword, 10);
        needsSave = true;
      }
      if (needsSave) {
        await admin.save();
        console.log(`✅ Admin account updated to username "${adminUsername}" and new environment password`);
      }
    }
  } catch (err) {
    console.error('Error seeding default admin:', err);
  }
}

// Database connection & Server initialization
async function startServer() {
  try {
    console.log('Connecting to MongoDB Atlas / Database...');
    await mongoose.connect(MONGO_URI, { dbName: 'trip_ledger' });
    console.log('✅ Connected successfully to MongoDB Database');

    // Express Session with MongoDB store
    app.use(
      session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: true, // Crucial for reverse proxy environments like Render
        store: MongoStore.create({
          mongoUrl: MONGO_URI,
          dbName: 'trip_ledger',
          collectionName: 'sessions',
          ttl: 14 * 24 * 60 * 60, // 14 days
          touchAfter: 24 * 3600,   // Only update session once per 24h
          autoRemove: 'native'
        }),
        cookie: {
          httpOnly: true,
          secure: 'auto', // Automatically uses secure cookies when accessed via HTTPS
          sameSite: 'lax',
          maxAge: 14 * 24 * 60 * 60 * 1000
        }
      })
    );

    // Seed initial admin user if not present
    await seedDefaultAdmin();

    // API Routes
    app.use('/api/auth/login', loginLimiter);
    app.use('/api/auth', authRoutes);
    app.use('/api/student', studentRoutes);  // Must be BEFORE /api to avoid admin middleware blocking student routes
    app.use('/api', adminRoutes);

    // Protected page access routing
    app.get('/', (req, res) => {
      if (!req.session || !req.session.user) {
        return res.redirect('/login.html');
      }
      if (req.session.user.role === 'student') {
        return res.redirect('/student.html');
      }
      res.redirect('/index.html');
    });

    // Admin Panel (requires admin login; otherwise redirects to admin-login.html)
    app.get('/index.html', (req, res) => {
      if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin-login.html');
      }
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Convenient shortcut /admin
    app.get('/admin', (req, res) => {
      if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin-login.html');
      }
      res.redirect('/index.html');
    });

    // Dedicated Admin Login Page
    app.get('/admin-login.html', (req, res) => {
      if (req.session && req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/index.html');
      }
      res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
    });

    // Dedicated Student Login Page (Admin button removed)
    app.get('/login.html', (req, res) => {
      if (req.session && req.session.user && req.session.user.role === 'student') {
        return res.redirect('/student.html');
      }
      res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    // Student Dashboard
    app.get('/student.html', (req, res) => {
      if (!req.session || !req.session.user) {
        return res.redirect('/login.html');
      }
      res.sendFile(path.join(__dirname, 'public', 'student.html'));
    });

    // Static assets
    app.use(express.static(path.join(__dirname, 'public')));

    // 404 handler for unknown routes
    app.use((req, res) => {
      if (req.accepts('html')) {
        return res.redirect('/login.html');
      }
      res.status(404).send('Not Found');
    });

    app.listen(PORT, () => {
      console.log(`🚀 Class Trip Ledger is live and listening on port ${PORT}`);
      console.log(`🔗 Local URL: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Database connection or server start failed:', err);
    process.exit(1);
  }
}

startServer();




