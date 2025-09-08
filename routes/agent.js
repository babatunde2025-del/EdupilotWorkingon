const express = require('express');
const router = express.Router();
const { isAuthenticated, isAgent, isNotBlocked } = require('../middleware/auth');
const Property = require('../models/Property');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Rating = require('../models/Rating');
const upload = require('../middleware/upload');

// Agent dashboard
router.get('/dashboard', isAuthenticated, isAgent, async (req, res) => {
  try {
    const agent = await User.findById(req.session.user._id);
    const properties = await Property.find({ agent: req.session.user._id })
      .sort({ createdAt: -1 });

    const deals = await Deal.find({ agent: req.session.user._id })
      .populate('property', 'title')
      .populate('client', 'fullName')
      .sort({ createdAt: -1 });

    const ratings = await Rating.find({ agent: req.session.user._id })
      .populate('client', 'fullName')
      .populate('property', 'title')
      .sort({ createdAt: -1 });

    res.render('agent/dashboard', {
      title: 'Agent Dashboard',
      agent,
      properties,
      deals,
      ratings
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Upload property page
router.get('/upload', isAuthenticated, isAgent, isNotBlocked, (req, res) => {
  res.render('agent/upload-property', {
    title: 'Upload Property'
  });
});

// Handle property upload
router.post('/upload', isAuthenticated, isAgent, isNotBlocked, 
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { title, description, price, state, area, propertyType } = req.body;

      // Validate required fields
      if (!title || !description || !price || !state || !area || !propertyType) {
        req.flash('error_msg', 'Please fill in all required fields');
        return res.redirect('/agent/upload');
      }

      // Check if exactly 5 images were uploaded
      if (!req.files.images || req.files.images.length !== 5) {
        req.flash('error_msg', 'Please upload exactly 5 images');
        return res.redirect('/agent/upload');
      }

      const property = new Property({
        title,
        description,
        price: parseFloat(price),
        location: { state, area },
        propertyType,
        images: req.files.images.map(file => file.filename),
        video: req.files.video ? req.files.video[0].filename : '',
        agent: req.session.user._id
      });

      await property.save();

      req.flash('success_msg', 'Property uploaded successfully!');
      res.redirect('/agent/dashboard');
    } catch (error) {
      console.error('Property upload error:', error);
      req.flash('error_msg', 'Error uploading property');
      res.redirect('/agent/upload');
    }
  });

// Edit property page
router.get('/edit/:id', isAuthenticated, isAgent, async (req, res) => {
  try {
    const property = await Property.findOne({ 
      _id: req.params.id, 
      agent: req.session.user._id 
    });

    if (!property) {
      req.flash('error_msg', 'Property not found');
      return res.redirect('/agent/dashboard');
    }

    res.render('agent/edit-property', {
      title: 'Edit Property',
      property
    });
  } catch (error) {
    console.error('Edit property error:', error);
    req.flash('error_msg', 'Error loading property');
    res.redirect('/agent/dashboard');
  }
});

// Handle property edit
router.post('/edit/:id', isAuthenticated, isAgent, async (req, res) => {
  try {
    const { title, description, price, state, area, propertyType, status } = req.body;
    
    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, agent: req.session.user._id },
      {
        title,
        description,
        price: parseFloat(price),
        location: { state, area },
        propertyType,
        status
      },
      { new: true }
    );

    if (!property) {
      req.flash('error_msg', 'Property not found');
      return res.redirect('/agent/dashboard');
    }

    req.flash('success_msg', 'Property updated successfully!');
    res.redirect('/agent/dashboard');
  } catch (error) {
    console.error('Property edit error:', error);
    req.flash('error_msg', 'Error updating property');
    res.redirect('/agent/dashboard');
  }
});

// Delete property
router.delete('/delete/:id', isAuthenticated, isAgent, async (req, res) => {
  try {
    const property = await Property.findOneAndDelete({ 
      _id: req.params.id, 
      agent: req.session.user._id 
    });

    if (!property) {
      req.flash('error_msg', 'Property not found');
      return res.redirect('/agent/dashboard');
    }

    req.flash('success_msg', 'Property deleted successfully!');
    res.redirect('/agent/dashboard');
  } catch (error) {
    console.error('Property delete error:', error);
    req.flash('error_msg', 'Error deleting property');
    res.redirect('/agent/dashboard');
  }
});

module.exports = router;