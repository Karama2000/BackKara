const Category = require('../../Models/TeacherModels/Categorie');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

// Définir le chemin du répertoire Uploads de manière configurable
const UPLOADS_DIR = path.join(__dirname, '../Uploads');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ teacherId: req.user._id });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories.' });
  }
};

// Create a new category
// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { nom, existingImage, existingAudio } = req.body;
    const imageFile = req.files?.image?.[0]; // Changé de imageUrl à image
    const audioFile = req.files?.audio?.[0];

    if (!nom) {
      // Supprimer les fichiers téléversés avant de retourner une erreur
      if (imageFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, imageFile.filename));
        } catch (err) {
          console.error(`Error cleaning up image file ${imageFile.filename}:`, err);
        }
      }
      if (audioFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, audioFile.filename));
        } catch (err) {
          console.error(`Error cleaning up audio file ${audioFile.filename}:`, err);
        }
      }
      return res.status(400).json({ message: 'Category name is required' });
    }
    if (!imageFile && !existingImage) {
      if (audioFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, audioFile.filename));
        } catch (err) {
          console.error(`Error cleaning up audio file ${audioFile.filename}:`, err);
        }
      }
      return res.status(400).json({ message: 'Image is required' });
    }

    const category = new Category({
      nom,
      imageUrl: imageFile ? imageFile.filename : existingImage,
      audioUrl: audioFile ? audioFile.filename : existingAudio || null,
      teacherId: req.user._id
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    // Nettoyer les fichiers téléversés en cas d'erreur
    if (req.files?.image) { // Changé de imageUrl à image
      try {
        await fs.unlink(path.join(UPLOADS_DIR, req.files.image[0].filename));
      } catch (err) {
        console.error(`Error cleaning up image file ${req.files.image[0].filename}:`, err);
      }
    }
    if (req.files?.audio) {
      try {
        await fs.unlink(path.join(UPLOADS_DIR, req.files.audio[0].filename));
      } catch (err) {
        console.error(`Error cleaning up audio file ${req.files.audio[0].filename}:`, err);
      }
    }
    res.status(500).json({ message: 'Error creating category.' });
  }
};

// Update a category
// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, existingImage, existingAudio } = req.body;
    const imageFile = req.files?.image?.[0]; // Changé de imageUrl à image
    const audioFile = req.files?.audio?.[0];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Nettoyer les fichiers téléversés avant de retourner une erreur
      if (imageFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, imageFile.filename));
        } catch (err) {
          console.error(`Error cleaning up Imagen file ${imageFile.filename}:`, err);
        }
      }
      if (audioFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, audioFile.filename));
        } catch (err) {
          console.error(`Error cleaning up audio file ${audioFile.filename}:`, err);
        }
      }
      return res.status(400).json({ message: 'Invalid category ID.' });
    }

    const category = await Category.findOne({ _id: id, teacherId: req.user._id });
    if (!category) {
      if (imageFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, imageFile.filename));
        } catch (err) {
          console.error(`Error cleaning up image file ${imageFile.filename}:`, err);
        }
      }
      if (audioFile) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, audioFile.filename));
        } catch (err) {
          console.error(`Error cleaning up audio file ${audioFile.filename}:`, err);
        }
      }
      return res.status(404).json({ message: 'Category not found or unauthorized.' });
    }

    category.nom = nom || category.nom;

    if (imageFile) {
      if (category.imageUrl && category.imageUrl !== existingImage) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, category.imageUrl));
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Error deleting old image file ${category.imageUrl}:`, err);
          } else {
            console.log(`Old image file ${category.imageUrl} not found, skipping deletion`);
          }
        }
      }
      category.imageUrl = imageFile.filename;
    } else if (existingImage) {
      category.imageUrl = existingImage;
    }

    if (audioFile) {
      if (category.audioUrl && category.audioUrl !== existingAudio) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, category.audioUrl));
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Error deleting old audio file ${category.audioUrl}:`, err);
          } else {
            console.log(`Old audio file ${category.audioUrl} not found, skipping deletion`);
          }
        }
      }
      category.audioUrl = audioFile.filename;
    } else if (existingAudio || audioFile === null) {
      category.audioUrl = existingAudio || null;
    }

    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    // Nettoyer les fichiers téléversés en cas d'erreur
    if (req.files?.image) { // Changé de imageUrl à image
      try {
        await fs.unlink(path.join(UPLOADS_DIR, req.files.image[0].filename));
      } catch (err) {
        console.error(`Error cleaning up image file ${req.files.image[0].filename}:`, err);
      }
    }
    if (req.files?.audio) {
      try {
        await fs.unlink(path.join(UPLOADS_DIR, req.files.audio[0].filename));
      } catch (err) {
        console.error(`Error cleaning up audio file ${req.files.audio[0].filename}:`, err);
      }
    }
    res.status(500).json({ message: 'Error updating category.' });
  }
};
// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID.' });
    }

    const category = await Category.findOne({ _id: categoryId, teacherId: req.user._id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found or unauthorized.' });
    }

    // Supprimer les fichiers associés (image et audio) s'ils existent
    if (category.imageUrl) {
      try {
        await fs.unlink(path.join(UPLOADS_DIR, category.imageUrl));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting image file ${category.imageUrl}:`, err);
        } else {
          console.log(`Image file ${category.imageUrl} not found, skipping deletion`);
        }
      }
    }

    if (category.audioUrl) {
      try {
        await fs.unlink(path.join(UPLOADS_DIR, category.audioUrl));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting audio file ${category.audioUrl}:`, err);
        } else {
          console.log(`Audio file ${category.audioUrl} not found, skipping deletion`);
        }
      }
    }

    // Supprimer la catégorie de la base de données
    await Category.findByIdAndDelete(categoryId);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category', error: err.message });
  }
};