const mongoose = require('mongoose');
const { Schema } = mongoose;

const programSchema = new Schema({
  niveauId: { type: Schema.Types.ObjectId, ref: 'Niveau', required: true },
  title: { type: String, required: true }, // e.g., "Mathématiques"
  description: { type: String },
});

const Program = mongoose.model('Program', programSchema);
module.exports = Program;