// Models/StudentModels/Progress.js
const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  notes: { type: String },
  currentPage: { type: Number, default: 1 }, // New field for current page
  completionDate: { type: Date },
});

module.exports = mongoose.model('Progress', progressSchema);