// Models/TeacherModels/QuizSubmission.js
const mongoose = require('mongoose');
const quizSubmissionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Eleve', required: true },
  responses: [{ questionId: mongoose.Schema.Types.ObjectId, selectedResponseIds: [String], matchingPairs: [{ leftId: String, rightId: String }] }],
  results: [{ questionId: mongoose.Schema.Types.ObjectId, question: String, isCorrect: Boolean, selectedAnswer: String }],
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  percentage: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);