// Models/TeacherModels/Lesson.js
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  title: { type: String, required: true },
  content: { type: String },
  mediaFile: { type: String },
  totalPages: { type: Number, default: 1 }, // New field for total pages
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
});

module.exports = mongoose.model('Lesson', lessonSchema);