const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  location: {
    state: {
      type: String,
      required: true
    },
    area: {
      type: String,
      required: true
    }
  },
  propertyType: {
    type: String,
    enum: ['rent', 'buy'],
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  video: {
    type: String,
    default: ''
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'rented'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  interested: [{
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Property', propertySchema);