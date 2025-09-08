const User = require('../models/User');

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/auth/login');
};

// Check if user is client
const isClient = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'client') {
    return next();
  }
  req.flash('error_msg', 'Access denied');
  res.redirect('/');
};

// Check if user is agent
const isAgent = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'agent') {
    return next();
  }
  req.flash('error_msg', 'Access denied');
  res.redirect('/');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied');
  res.redirect('/');
};

// Check if agent is not blocked
const isNotBlocked = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (user.isBlocked) {
      req.flash('error_msg', 'Your account is blocked due to unpaid commissions');
      return res.redirect('/agent/dashboard');
    }
    next();
  } catch (error) {
    req.flash('error_msg', 'Error checking account status');
    res.redirect('/agent/dashboard');
  }
};

module.exports = {
  isAuthenticated,
  isClient,
  isAgent,
  isAdmin,
  isNotBlocked
};