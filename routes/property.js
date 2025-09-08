const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');

// Property details
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('agent', 'fullName phone rating totalRatings');

    if (!property) {
      req.flash('error_msg', 'Property not found');
      return res.redirect('/houses');
    }

    // Increment views
    property.views += 1;
    await property.save();

    // Check if client has unlocked this agent
    let hasUnlocked = false;
    if (req.session.user && req.session.user.role === 'client') {
      const client = await User.findById(req.session.user._id);
      hasUnlocked = client.unlockedAgents.includes(property.agent._id);
    }

    res.render('property/details', {
      title: property.title,
      property,
      hasUnlocked
    });
  } catch (error) {
    console.error('Property details error:', error);
    req.flash('error_msg', 'Error loading property');
    res.redirect('/houses');
  }
});

module.exports = router;