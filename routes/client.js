const express = require('express');
const router = express.Router();
const { isAuthenticated, isClient } = require('../middleware/auth');
const Property = require('../models/Property');
const User = require('../models/User');
const Rating = require('../models/Rating');
const ContactRequest = require('../models/ContactRequest');

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

    const client = await User.findById(req.session.user._id);

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

// Contact agent
router.post('/contact-agent', isAuthenticated, isClient, async (req, res) => {
  try {
    const { agentId, propertyId } = req.body;
    
    // Validate inputs
    if (!agentId || !propertyId) {
      return res.status(400).json({ error: 'Missing agent or property ID' });
    }

    // Check if contact request already exists
    const existingRequest = await ContactRequest.findOne({
      client: req.session.user._id,
      agent: agentId,
      property: propertyId
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You have already contacted this agent for this property' });
    }

    // Get client, agent, and property details
    const client = await User.findById(req.session.user._id);
    const agent = await User.findById(agentId);
    const property = await Property.findById(propertyId);

    if (!client || !agent || !property) {
      return res.status(404).json({ error: 'Client, agent, or property not found' });
    }

    // Create contact request
    const contactRequest = new ContactRequest({
      client: client._id,
      agent: agent._id,
      property: property._id
    });

    await contactRequest.save();

    // Send email notifications
    const emailTransporter = req.app.locals.emailTransporter;
    
    const emailContent = `
      <h2>🏠 New Contact Request - HomLet</h2>
      <p><strong>Client:</strong> ${client.fullName} (${client.email})</p>
      <p><strong>Phone:</strong> ${client.phone}</p>
      <p><strong>Agent:</strong> ${agent.fullName} (${agent.email})</p>
      <p><strong>Property:</strong> ${property.title}</p>
      <p><strong>Location:</strong> ${property.location.area}, ${property.location.state}</p>
      <p><strong>Price:</strong> ₦${property.price.toLocaleString()}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr>
      <p>Please follow up on this contact request.</p>
    `;

    // Send to admin emails
    const adminEmails = ['anthonyajibola65@gmail.com', 'Kennethuwota12@gmail.com'];
    
    for (const email of adminEmails) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER || 'noreply@homlet.com',
          to: email,
          subject: `🏠 New Contact Request - ${client.fullName} contacted ${agent.fullName}`,
          html: emailContent
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    res.json({ success: true, message: 'Contact request sent successfully' });
  } catch (error) {
    console.error('Contact agent error:', error);
    res.status(500).json({ error: 'Failed to send contact request' });
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