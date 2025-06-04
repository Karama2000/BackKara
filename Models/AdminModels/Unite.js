const mongoose = require('mongoose');
const { Schema } = mongoose;

const unitSchema = new Schema({
  programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  title: { type: String, required: true }, // e.g., "Algèbre"
  description: { type: String },
});

const Unit = mongoose.model('Unit', unitSchema);
module.exports = Unit;