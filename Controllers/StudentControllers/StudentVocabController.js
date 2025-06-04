const Vocabulary = require('../../Models/TeacherModels/Vocab');
const Category = require('../../Models/TeacherModels/Categorie');
const mongoose = require('mongoose');

// Get all categories for students
exports.getStudentCategories = async (req, res) => {
  try {
    const student = req.user;
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const categories = await Category.find().select('nom imageUrl audioUrl').lean();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching student categories:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des catégories.' });
  }
};

// Get all vocabulary for students, optionally filtered by category
exports.getStudentVocab = async (req, res) => {
  try {
    const student = req.user;
    const { categorieId } = req.query;

    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const query = {};
    if (categorieId && mongoose.Types.ObjectId.isValid(categorieId)) {
      query.categorieId = categorieId;
    }

    const vocab = await Vocabulary.find(query)
      .populate('categorieId', 'nom')
      .lean();

    res.status(200).json(vocab);
  } catch (error) {
    console.error('Error fetching student vocabulary:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du vocabulaire.' });
  }
};