const mongoose = require('mongoose');

const vocabularySchema = new mongoose.Schema({
  mot: {
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
  categorieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Vocabulary', vocabularySchema);