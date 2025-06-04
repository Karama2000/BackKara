const Game = require('../../Models/TeacherModels/Game');
const Section = require('../../Models/TeacherModels/Section');
const Score = require('../../Models/StudentModels/GameScore');
const mongoose = require('mongoose');
const Notification = require('../../Models/SystemeNotif/Notification');

// Get all sections (student access)
exports.getSections = async (req, res) => {
  try {
    const sections = await Section.find().populate('createdBy', 'username');
    res.json(sections);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get games by section (student access)
exports.getGamesBySection = async (req, res) => {
  try {
    const games = await Game.find({ section: req.params.sectionId });
    res.json(games);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Save or update score (student only)
exports.saveScore = async (req, res) => {
  const { gameId, score } = req.body;
  try {
    if (!gameId || score === undefined) {
      throw new Error('Game ID et score sont requis');
    }
    const existingScore = await Score.findOne({ user: req.user.userId, game: gameId });
    if (existingScore) {
      existingScore.score = score;
      existingScore.date = Date.now();
      await existingScore.save();
      res.json(existingScore);
    } else {
      const newScore = new Score({ user: req.user.userId, game: gameId, score });
      await newScore.save();
      res.status(201).json(newScore);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get scores for a user (student access)
// Get scores for a user (student access)
exports.getUserScores = async (req, res) => {
  try {
    const { gameId } = req.query; // Ajouter la possibilité de filtrer par gameId
    let query = { user: req.user.userId };
    if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
      query.game = gameId;
    }
    const scores = await Score.find(query)
      .populate('game', 'name')
      .sort({ date: -1 }); // Trier par date décroissante
    res.json(scores);
  } catch (error) {
    console.error('Error fetching user scores:', error);
    res.status(400).json({ error: error.message });
  }
};
// ... autres importations et code ...

// Save a game score (student only)
exports.saveGameScore = async (req, res) => {
  const { gameId } = req.body || {};
  const screenshot = req.file ? `/Uploads/${req.file.filename}` : null;
  try {
    console.log('saveGameScore - req.body:', req.body);
    console.log('saveGameScore - req.file:', req.file);
    console.log('saveGameScore - req.user:', req.user);

    if (!req.user || !req.user.userId) {
      throw new Error('Utilisateur non authentifié');
    }
    if (!gameId || !mongoose.Types.ObjectId.isValid(gameId)) {
      throw new Error('GameId invalide');
    }
    if (!screenshot) {
      throw new Error('Capture d’écran requise');
    }
    const game = await Game.findById(gameId).populate('createdBy');
    if (!game) {
      throw new Error('Jeu non trouvé');
    }
    if (!game.createdBy || !game.createdBy._id) {
      throw new Error('Créateur du jeu non défini');
    }
    const gameScore = new Score({
      user: req.user.userId,
      game: gameId,
      screenshot,
    });
    await gameScore.save();

    // Create notification with correct schema fields
    const notification = new Notification({
      userId: game.createdBy._id, // Set userId to the game creator (teacher/parent)
      type: 'game_score',
      message: `Nouvelle capture de score soumise pour le jeu ${game.name} par ${req.user.prenom} ${req.user.nom}`,
      relatedId: gameScore._id, // Optionally link to the score
      relatedModel: 'Score',
      read: false,
    });
    await notification.save();

    res.status(201).json({ message: 'Score sauvegardé', score: gameScore });
  } catch (error) {
    console.error('Error saving game score:', error);
    res.status(400).json({ error: error.message });
  }
};

// ... autres fonctions existantes ...