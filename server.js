const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load .env

const app = express();

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Make transporter available globally
app.locals.emailTransporter = transporter;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homlet';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⚠️  App will continue but database features may not work');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'homlet-ultra-secure-session-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const User = require('./models/User');
const Property = require('./models/Property');
const Deal = require('./models/Deal');
const Rating = require('./models/Rating');
const ContactRequest = require('./models/ContactRequest');

async function createDefaultAdmin() {
  try {
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@example.com' });
    if (!existingAdmin) {
      const adminUser = new User({
        fullName: 'HomLet Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        phone: '+234-800-HOMLET',
        password: process.env.ADMIN_PASSWORD || 'password123',
        role: 'admin'
      });
      await adminUser.save();
      console.log(`✅ Default admin created: ${adminUser.email} / ${adminUser.password}`);
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('⚠️  Error creating admin user:', error.message);
  }
}

mongoose.connection.once('open', () => {
  createDefaultAdmin();
});

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/client');
const agentRoutes = require('./routes/agent');
const adminRoutes = require('./routes/admin');
const propertyRoutes = require('./routes/property');
const paymentRoutes = require('./routes/payment');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/client', clientRoutes);
app.use('/agent', agentRoutes);
app.use('/admin', adminRoutes);
app.use('/property', propertyRoutes);
app.use('/payment', paymentRoutes);

app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found - HomLet',
    url: req.originalUrl 
  });
});

app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).render('error', { 
    title: 'Server Error - HomLet',
    error: isDevelopment ? err : { message: 'Something went wrong!' }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 HomLet Server Started Successfully!');
  console.log(`📱 Access the app at: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin login: ${process.env.ADMIN_EMAIL || 'admin@example.com'} / ${process.env.ADMIN_PASSWORD || 'password123'}`);
  console.log(`🏠 Ready to serve property listings!\n`);
});

module.exports = app;
