const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
  },
  imageUrl: {
    type: String,
  },
  audioUrl: {
    type: String,
    required: false,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Category', categorySchema);