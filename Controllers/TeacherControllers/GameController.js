const Game = require('../../Models/TeacherModels/Game');
const Section = require('../../Models/TeacherModels/Section');
const Score = require('../../Models/StudentModels/GameScore');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Ensure Uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../Uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create a section (teacher only)
exports.createSection = async (req, res) => {
  const { name } = req.body;
  const image = req.file ? `/Uploads/${req.file.filename}` : null;
  try {
    console.log('createSection - req.body:', req.body);
    console.log('createSection - req.file:', req.file);
    if (!name) {
      throw new Error('Le nom de la section est requis');
    }
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    const section = new Section({ name, image, createdBy: req.user.userId });
    await section.save();
    res.status(201).json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get all sections (teacher only)
exports.getSections = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    const sections = await Section.find({ createdBy: req.user.userId }).populate('createdBy', 'username');
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(400).json({ error: error.message });
  }
};

// Create a game (teacher only)
exports.createGame = async (req, res) => {
  const { name, url, section } = req.body;
  const image = req.file ? `/Uploads/${req.file.filename}` : null;
  try {
    console.log('createGame - req.body:', req.body);
    console.log('createGame - req.file:', req.file);

    if (!name || !url || !section) {
      throw new Error('Les champs nom, URL et section sont requis');
    }
    if (!image) {
      throw new Error('Une image est requise pour le jeu');
    }
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    if (!mongoose.Types.ObjectId.isValid(section)) {
      throw new Error('ID de section invalide');
    }
    const sectionExists = await Section.findById(section);
    if (!sectionExists) {
      throw new Error('Section non trouvée');
    }
    const game = new Game({ name, image, url, section, createdBy: req.user.userId });
    await game.save();
    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(400).json({ error: error.message });
  }
};
// Get all games (teacher only)
exports.getAllGames = async (req, res) => {
  try {
    const games = await Game.find({}).populate('section', 'name');
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get scores for a game (teacher only)
exports.getGameScores = async (req, res) => {
  try {
    const scores = await Score.find({ game: req.params.gameId })
      .populate('user', 'prenom nom') // Inclure prénom et nom
      .populate('game', 'name')
      .sort({ date: -1 }); // Trier par date décroissante
    res.json(scores);
  } catch (error) {
    console.error('Error fetching game scores:', error);
    res.status(400).json({ error: error.message });
  }
};
exports.markScoreReviewed = async (req, res) => {
  try {
    const score = await Score.findById(req.params.scoreId);
    if (!score) {
      throw new Error('Score non trouvé');
    }
    if (score.reviewed) {
      throw new Error('Score déjà revu');
    }
    score.reviewed = true;
    await score.save();
    res.json({ message: 'Score marqué comme revu', score });
  } catch (error) {
    console.error('Error marking score reviewed:', error);
    res.status(400).json({ error: error.message });
  }
};
// Update a section (teacher only)
exports.updateSection = async (req, res) => {
  const { name } = req.body;
  const image = req.file ? `/Uploads/${req.file.filename}` : null;
  try {
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    const section = await Section.findById(req.params.sectionId);
    if (!section) {
      throw new Error('Section non trouvée');
    }
    if (section.createdBy.toString() !== req.user.userId) {
      throw new Error('Non autorisé à modifier cette section');
    }
    section.name = name || section.name;
    if (image) {
      // Supprimer l'ancienne image si elle existe
      if (section.image) {
        const oldImagePath = path.join(__dirname, '../../', section.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      section.image = image;
    }
    await section.save();
    res.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(400).json({ error: error.message });
  }
};
// Delete a section (teacher only)
exports.deleteSection = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    const section = await Section.findById(req.params.sectionId);
    if (!section) {
      throw new Error('Section non trouvée');
    }
    if (section.createdBy.toString() !== req.user.userId) {
      throw new Error('Non autorisé à supprimer cette section');
    }
    // Supprimer les jeux associés
    await Game.deleteMany({ section: section._id });
    // Supprimer l'image de la section si elle existe
    if (section.image) {
      const imagePath = path.join(__dirname, '../../', section.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    await section.deleteOne();
    res.json({ message: 'Section supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(400).json({ error: error.message });
  }
};
// Update a game (teacher only)
exports.updateGame = async (req, res) => {
  const { name, url, section } = req.body;
  const image = req.file ? `/Uploads/${req.file.filename}` : null;
  try {
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      throw new Error('Jeu non trouvé');
    }
    if (game.createdBy.toString() !== req.user.userId) {
      throw new Error('Non autorisé à modifier ce jeu');
    }
    game.name = name || game.name;
    game.url = url || game.url;
    game.section = section || game.section;
    if (image) {
      // Supprimer l'ancienne image si elle existe
      if (game.image) {
        const oldImagePath = path.join(__dirname, '../../', game.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      game.image = image;
    }
    await game.save();
    res.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(400).json({ error: error.message });
  }
};
// Delete a game (teacher only)
exports.deleteGame = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      throw new Error('Jeu non trouvé');
    }
    if (game.createdBy.toString() !== req.user.userId) {
      throw new Error('Non autorisé à supprimer ce jeu');
    }
    // Supprimer les scores associés
    await Score.deleteMany({ game: game._id });
    // Supprimer l'image du jeu si elle existe
    if (game.image) {
      const imagePath = path.join(__dirname, '../../', game.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    await game.deleteOne();
    res.json({ message: 'Jeu supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(400).json({ error: error.message });
  }
};
