const mongoose = require('mongoose');

const testSubmissionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Eleve', required: true },
  anonymousId: { type: String, required: true, unique: true }, // Champ pour anonymisation
  submittedFile: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'corrected', 'rejected'],
    default: 'pending',
    required: true
  },
  feedback: { type: String },
  submittedAt: { type: Date, default: Date.now },
  correctedAt: { type: Date },
  correctionFile: { type: String }
});

// Générer un ID anonyme unique avant de sauvegarder
testSubmissionSchema.pre('save', function (next) {
  if (!this.anonymousId) {
    this.anonymousId = mongoose.Types.ObjectId().toString();
  }
  next();
});

module.exports = mongoose.model('TestSubmission', testSubmissionSchema);