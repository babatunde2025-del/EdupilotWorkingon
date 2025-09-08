const express = require('express');
const router = express.Router();
const { isAuthenticated, isClient } = require('../middleware/auth');
const Property = require('../models/Property');
const User = require('../models/User');
const Rating = require('../models/Rating');

// Client dashboard
router.get('/dashboard', isAuthenticated, isClient, async (req, res) => {
  try {
    const { state, area, minPrice, maxPrice, type } = req.query;
    const filter = { status: 'active' };

    if (state) filter['location.state'] = new RegExp(state, 'i');
    if (area) filter['location.area'] = new RegExp(area, 'i');
    if (minPrice) filter.price = { $gte: parseInt(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseInt(maxPrice) };
    if (type) filter.propertyType = type;

    const properties = await Property.find(filter)
      .populate('agent', 'fullName phone')
      .sort({ createdAt: -1 });

    const client = await User.findById(req.session.user._id)
      .populate('unlockedAgents', 'fullName phone');

    res.render('client/dashboard', {
      title: 'Client Dashboard',
      properties,
      client,
      filters: { state, area, minPrice, maxPrice, type }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Payment history
router.get('/payments', isAuthenticated, isClient, async (req, res) => {
  try {
    const client = await User.findById(req.session.user._id)
      .populate('paymentHistory.propertyId', 'title')
      .populate('paymentHistory.agentId', 'fullName');

    res.render('client/payments', {
      title: 'Payment History',
      client
    });
  } catch (error) {
    console.error('Payment history error:', error);
    req.flash('error_msg', 'Error loading payment history');
    res.redirect('/client/dashboard');
  }
});

// Rate agent page
router.get('/rate/:agentId', isAuthenticated, isClient, async (req, res) => {
  try {
    const agent = await User.findById(req.params.agentId);
    if (!agent || agent.role !== 'agent') {
      req.flash('error_msg', 'Agent not found');
      return res.redirect('/client/dashboard');
    }

    const client = await User.findById(req.session.user._id);
    if (!client.unlockedAgents.includes(agent._id)) {
      req.flash('error_msg', 'You can only rate agents you have unlocked');
      return res.redirect('/client/dashboard');
    }

    // Get properties by this agent that the client has accessed
    const properties = await Property.find({ agent: agent._id });

    res.render('client/rate-agent', {
      title: 'Rate Agent',
      agent,
      properties
    });
  } catch (error) {
    console.error('Rate agent error:', error);
    req.flash('error_msg', 'Error loading rating page');
    res.redirect('/client/dashboard');
  }
});

// Submit rating
router.post('/rate/:agentId', isAuthenticated, isClient, async (req, res) => {
  try {
    const { rating, comment, propertyId } = req.body;
    const agentId = req.params.agentId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      req.flash('error_msg', 'Please provide a valid rating (1-5)');
      return res.redirect(`/client/rate/${agentId}`);
    }

    // Check if client has already rated this agent for this property
    const existingRating = await Rating.findOne({
      client: req.session.user._id,
      agent: agentId,
      property: propertyId
    });

    if (existingRating) {
      req.flash('error_msg', 'You have already rated this agent for this property');
      return res.redirect('/client/dashboard');
    }

    // Create new rating
    const newRating = new Rating({
      client: req.session.user._id,
      agent: agentId,
      property: propertyId,
      rating: parseInt(rating),
      comment
    });

    await newRating.save();

    // Update agent's average rating
    const agent = await User.findById(agentId);
    const allRatings = await Rating.find({ agent: agentId });
    const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / allRatings.length;

    agent.rating = avgRating;
    agent.totalRatings = allRatings.length;
    await agent.save();

    req.flash('success_msg', 'Rating submitted successfully!');
    res.redirect('/client/dashboard');
  } catch (error) {
    console.error('Submit rating error:', error);
    req.flash('error_msg', 'Error submitting rating');
    res.redirect('/client/dashboard');
  }
});

module.exports = router;