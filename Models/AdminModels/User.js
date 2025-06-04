const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  niveaux: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Niveau' }],
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Classe' }],
  imageUrl: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: function() {
      return this.role === 'admin' ? 'approved' : 'pending';
    }
  },
  resetPasswordToken: { type: String }, // Add reset token field
  resetPasswordExpires: { type: Date }, // Add reset token expiration field
}, { timestamps: true, discriminatorKey: '__t' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;