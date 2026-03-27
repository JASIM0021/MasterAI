const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  format: {
    type: String,
    default: 'png',
  },
});

module.exports = mongoose.model('Logo', logoSchema); 