const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Property = require('../models/Property');
const Deal = require('../models/Deal');
const Rating = require('../models/Rating');

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
});

// Handle admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists and is admin
    const user = await User.findOne({ email, role: 'admin' });
    
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error_msg', 'Invalid admin credentials');
      return res.redirect('/admin/login');
    }

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', 'Welcome to admin panel');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    req.flash('error_msg', 'Login failed');
    res.redirect('/admin/login');
  }
});

// Admin dashboard
router.get('/dashboard', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const clientsCount = await User.countDocuments({ role: 'client' });
    const agentsCount = await User.countDocuments({ role: 'agent' });
    const propertiesCount = await Property.countDocuments();
    const pendingDeals = await Deal.countDocuments({ status: 'pending' });

    const recentClients = await User.find({ role: 'client' })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentAgents = await User.find({ role: 'agent' })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentProperties = await Property.find()
      .populate('agent', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        clientsCount,
        agentsCount,
        propertiesCount,
        pendingDeals
      },
      recentClients,
      recentAgents,
      recentProperties
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Clients management
router.get('/clients', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' })
      .sort({ createdAt: -1 });

    res.render('admin/clients', {
      title: 'Manage Clients',
      clients
    });
  } catch (error) {
    console.error('Clients management error:', error);
    req.flash('error_msg', 'Error loading clients');
    res.redirect('/admin/dashboard');
  }
});

// Agents management
router.get('/agents', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' })
      .sort({ createdAt: -1 });

    res.render('admin/agents', {
      title: 'Manage Agents',
      agents
    });
  } catch (error) {
    console.error('Agents management error:', error);
    req.flash('error_msg', 'Error loading agents');
    res.redirect('/admin/dashboard');
  }
});

// Properties management
router.get('/properties', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const properties = await Property.find()
      .populate('agent', 'fullName')
      .sort({ createdAt: -1 });

    res.render('admin/properties', {
      title: 'Manage Properties',
      properties
    });
  } catch (error) {
    console.error('Properties management error:', error);
    req.flash('error_msg', 'Error loading properties');
    res.redirect('/admin/dashboard');
  }
});

// Deals management
router.get('/deals', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('property', 'title')
      .populate('client', 'fullName')
      .populate('agent', 'fullName')
      .sort({ createdAt: -1 });

    res.render('admin/deals', {
      title: 'Manage Deals',
      deals
    });
  } catch (error) {
    console.error('Deals management error:', error);
    req.flash('error_msg', 'Error loading deals');
    res.redirect('/admin/dashboard');
  }
});

// Block/Unblock agent
router.post('/toggle-agent/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent || agent.role !== 'agent') {
      req.flash('error_msg', 'Agent not found');
      return res.redirect('/admin/agents');
    }

    agent.isBlocked = !agent.isBlocked;
    await agent.save();

    req.flash('success_msg', `Agent ${agent.isBlocked ? 'blocked' : 'unblocked'} successfully`);
    res.redirect('/admin/agents');
  } catch (error) {
    console.error('Toggle agent error:', error);
    req.flash('error_msg', 'Error updating agent status');
    res.redirect('/admin/agents');
  }
});

// Close deal
router.post('/close-deal/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );

    if (!deal) {
      req.flash('error_msg', 'Deal not found');
      return res.redirect('/admin/deals');
    }

    req.flash('success_msg', 'Deal closed successfully');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Close deal error:', error);
    req.flash('error_msg', 'Error closing deal');
    res.redirect('/admin/deals');
  }
});

// Flag deal
router.post('/flag-deal/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { status: 'flagged' },
      { new: true }
    );

    if (!deal) {
      req.flash('error_msg', 'Deal not found');
      return res.redirect('/admin/deals');
    }

    req.flash('success_msg', 'Deal flagged successfully');
    res.redirect('/admin/deals');
  } catch (error) {
    console.error('Flag deal error:', error);
    req.flash('error_msg', 'Error flagging deal');
    res.redirect('/admin/deals');
  }
});

module.exports = router;