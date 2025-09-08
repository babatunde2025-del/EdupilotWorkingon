const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// Home page
router.get('/', async (req, res) => {
  try {
    const featuredProperties = await Property.find({ status: 'active' })
      .populate('agent', 'fullName')
      .limit(6)
      .sort({ createdAt: -1 });

    res.render('index', {
      title: 'HomLet - Find Your Perfect Home',
      featuredProperties
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.render('index', {
      title: 'HomLet - Find Your Perfect Home',
      featuredProperties: []
    });
  }
});

// Houses listing page
router.get('/houses', async (req, res) => {
  try {
    const { state, area, minPrice, maxPrice, type } = req.query;
    const filter = { status: 'active' };

    if (state) filter['location.state'] = new RegExp(state, 'i');
    if (area) filter['location.area'] = new RegExp(area, 'i');
    if (minPrice) filter.price = { $gte: parseInt(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseInt(maxPrice) };
    if (type) filter.propertyType = type;

    const properties = await Property.find(filter)
      .populate('agent', 'fullName')
      .sort({ createdAt: -1 });

    res.render('houses', {
      title: 'Browse Properties',
      properties,
      filters: { state, area, minPrice, maxPrice, type }
    });
  } catch (error) {
    console.error('Error loading houses:', error);
    req.flash('error_msg', 'Error loading properties');
    res.redirect('/');
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { title: 'About HomLet' });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us' });
});

module.exports = router;