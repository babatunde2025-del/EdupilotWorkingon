const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const upload = require('../middleware/upload');

// Client login page
router.get('/client-login', (req, res) => {
  res.render('auth/client-login', { title: 'Client Login' });
});

// Agent login page
router.get('/agent-login', (req, res) => {
  res.render('auth/agent-login', { title: 'Agent Login' });
});

// Handle client login
router.post('/client-login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid credentials');
    return res.redirect('/auth/client-login');
  }

  try {
    const { email, password } = req.body;
    // Only allow client users
    const user = await User.findOne({ email, role: 'client' });

    if (!user || !(await user.comparePassword(password))) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/client-login');
    }

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    res.redirect('/client/dashboard');
  } catch (error) {
    console.error('Client login error:', error);
    req.flash('error_msg', 'Login failed');
    res.redirect('/auth/client-login');
  }
});

// Handle agent login
router.post('/agent-login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid credentials');
    return res.redirect('/auth/agent-login');
  }

  try {
    const { email, password } = req.body;
    // Only allow agent users
    const user = await User.findOne({ email, role: 'agent' });

    if (!user || !(await user.comparePassword(password))) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/agent-login');
    }

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    res.redirect('/agent/dashboard');
  } catch (error) {
    console.error('Agent login error:', error);
    req.flash('error_msg', 'Login failed');
    res.redirect('/auth/agent-login');
  }
});

// Client register page
router.get('/client-register', (req, res) => {
  res.render('auth/client-register', { title: 'Client Registration' });
});

// Handle client registration
router.post('/client-register', [
  body('fullName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid information');
    return res.redirect('/auth/client-register');
  }

  try {
    const { fullName, email, phone, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/client-register');
    }

    const user = new User({
      fullName,
      email,
      phone,
      password,
      role: 'client'
    });

    await user.save();

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', 'Registration successful!');
    res.redirect('/client/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'Registration failed');
    res.redirect('/auth/client-register');
  }
});

// Agent register page
router.get('/agent-register', (req, res) => {
  res.render('auth/agent-register', { title: 'Agent Registration' });
});

// Handle agent registration
router.post('/agent-register', upload.single('profilePicture'), [
  body('fullName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('password').isLength({ min: 6 }),
  body('commission').isNumeric().isFloat({ min: 0, max: 100 }),
  body('bio').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid information');
    return res.redirect('/auth/agent-register');
  }

  try {
    const { fullName, email, phone, password, commission, bio } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/agent-register');
    }

    const user = new User({
      fullName,
      email,
      phone,
      password,
      role: 'agent',
      commission: parseFloat(commission),
      bio,
      profilePicture: req.file ? req.file.filename : ''
    });

    await user.save();

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', 'Registration successful!');
    res.redirect('/agent/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'Registration failed');
    res.redirect('/auth/agent-register');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;