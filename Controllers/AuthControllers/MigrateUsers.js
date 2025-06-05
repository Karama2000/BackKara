const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Charger le fichier .env depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../../Models/AdminModels/User');

async function migrateUsers() {
  try {
    // Vérifier si MONGODB_URI est défini
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI n\'est pas défini dans le fichier .env');
    }

    console.log('MONGODB_URI:', process.env.MONGODB_URI); // Pour débogage

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecté à MongoDB');

    // Mettre à jour tous les utilisateurs sans champ status
    const result = await User.updateMany(
      { status: { $exists: false } }, // Utilisateurs sans champ status
      { $set: { status: 'approved', isConfirmed: true } } // Approuver et confirmer
    );

    console.log(`Migration terminée : ${result.modifiedCount} utilisateurs mis à jour`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    mongoose.connection.close();
    process.exit(1); // Terminer avec une erreur
  }
}

migrateUsers();