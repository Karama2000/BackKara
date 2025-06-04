const mongoose = require('mongoose');

const testSubmissionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Eleve', required: true },
  submittedFile: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'corrected', 'rejected'], // Example enum values
    default: 'pending',
    required: true
  },
  feedback: { type: String },
  submittedAt: { type: Date, default: Date.now },
  correctionFile: { type: String }
});

module.exports = mongoose.model('TestSubmission', testSubmissionSchema);