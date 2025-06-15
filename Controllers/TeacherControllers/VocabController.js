const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const Vocabulary = require('../../Models/TeacherModels/Vocab');

// Define UPLOADS_DIR relative to the project root
const UPLOADS_DIR = path.join(__dirname, '../../Uploads');

// Ensure the uploads directory exists
const initializeUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    // Silent error handling to avoid logging
  }
};
initializeUploadsDir();

exports.getAllVocab = async (req, res) => {
  try {
    const vocab = await Vocabulary.find({ teacherId: req.user._id }).populate('categorieId', 'nom');
    res.status(200).json(vocab);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du vocabulaire.' });
  }
};

exports.createVocab = async (req, res) => {
  try {
    const { mot, categorieId, existingImage, existingAudio } = req.body;
    const imageFile = req.files?.image?.[0];
    const audioFile = req.files?.audio?.[0];

    if (!mot) {
      if (imageFile) await cleanFile(imageFile.filename);
      if (audioFile) await cleanFile(audioFile.filename);
      return res.status(400).json({ message: 'Le mot est requis' });
    }
    if (!categorieId || !mongoose.Types.ObjectId.isValid(categorieId)) {
      if (imageFile) await cleanFile(imageFile.filename);
      if (audioFile) await cleanFile(audioFile.filename);
      return res.status(400).json({ message: 'Un ID de catégorie valide est requis' });
    }
    if (!imageFile && !existingImage) {
      if (audioFile) await cleanFile(audioFile.filename);
      return res.status(400).json({ message: 'Une image est requise' });
    }

    // Verify file existence if uploaded
    if (imageFile) {
      const imagePath = path.join(UPLOADS_DIR, imageFile.filename);
      try {
        await fs.access(imagePath);
      } catch (err) {
        if (audioFile) await cleanFile(audioFile.filename);
        return res.status(500).json({ message: 'Échec du téléversement de l\'image: fichier introuvable' });
      }
    }
    if (audioFile) {
      const audioPath = path.join(UPLOADS_DIR, audioFile.filename);
      try {
        await fs.access(audioPath);
      } catch (err) {
        if (imageFile) await cleanFile(imageFile.filename);
        return res.status(500).json({ message: 'Échec du téléversement du fichier audio: fichier introuvable' });
      }
    }

    const vocab = new Vocabulary({
      mot,
      imageUrl: imageFile ? imageFile.filename : existingImage,
      audioUrl: audioFile ? audioFile.filename : existingAudio || null,
      categorieId,
      teacherId: req.user._id,
    });

    await vocab.save();
    const populatedVocab = await Vocabulary.findById(vocab._id).populate('categorieId', 'nom');
    res.status(201).json(populatedVocab);
  } catch (error) {
    if (req.files?.image) await cleanFile(req.files.image[0].filename);
    if (req.files?.audio) await cleanFile(req.files.audio[0].filename);
    res.status(500).json({ message: 'Erreur lors de la création du vocabulaire' });
  }
};

exports.updateVocab = async (req, res) => {
  try {
    const { id } = req.params;
    const { mot, categorieId, existingImage, existingAudio } = req.body;
    const imageFile = req.files?.image?.[0];
    const audioFile = req.files?.audio?.[0];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (imageFile) await cleanFile(imageFile.filename);
      if (audioFile) await cleanFile(audioFile.filename);
      return res.status(400).json({ message: 'ID de vocabulaire invalide.' });
    }

    const vocab = await Vocabulary.findOne({ _id: id, teacherId: req.user._id });
    if (!vocab) {
      if (imageFile) await cleanFile(imageFile.filename);
      if (audioFile) await cleanFile(audioFile.filename);
      return res.status(404).json({ message: 'Vocabulaire non trouvé' });
    }

    vocab.mot = mot || vocab.mot;
    vocab.categorieId = categorieId || vocab.categorieId;

    if (imageFile) {
      if (vocab.imageUrl && vocab.imageUrl !== existingImage) {
        await cleanFile(vocab.imageUrl);
      }
      const imagePath = path.join(UPLOADS_DIR, imageFile.filename);
      try {
        await fs.access(imagePath);
      } catch (err) {
        if (audioFile) await cleanFile(audioFile.filename);
        return res.status(500).json({ message: 'Échec du téléversement de l\'image: fichier introuvable' });
      }
      vocab.imageUrl = imageFile.filename;
    } else if (existingImage) {
      vocab.imageUrl = existingImage;
    }

    if (audioFile) {
      if (vocab.audioUrl && vocab.audioUrl !== existingAudio) {
        await cleanFile(vocab.audioUrl);
      }
      const audioPath = path.join(UPLOADS_DIR, audioFile.filename);
      try {
        await fs.access(audioPath);
      } catch (err) {
        if (imageFile) await cleanFile(imageFile.filename);
        return res.status(500).json({ message: 'Échec du téléversement du fichier audio: fichier introuvable' });
      }
      vocab.audioUrl = audioFile.filename;
    } else if (existingAudio !== undefined) {
      if (vocab.audioUrl && vocab.audioUrl !== existingAudio) {
        await cleanFile(vocab.audioUrl);
      }
      vocab.audioUrl = existingAudio || null;
    }

    await vocab.save();
    const populatedVocab = await Vocabulary.findById(vocab._id).populate('categorieId', 'nom');
    res.status(200).json(populatedVocab);
  } catch (error) {
    if (req.files?.image) await cleanFile(req.files.image[0].filename);
    if (req.files?.audio) await cleanFile(req.files.audio[0].filename);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du vocabulaire' });
  }
};

exports.deleteVocab = async (req, res) => {
  try {
    const { id } = req.params;
    const vocab = await Vocabulary.findOneAndDelete({ _id: id, teacherId: req.user._id });
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulaire non trouvé' });
    }

    if (vocab.imageUrl) {
      await cleanFile(vocab.imageUrl);
    }
    if (vocab.audioUrl) {
      await cleanFile(vocab.audioUrl);
    }

    res.status(200).json({ message: 'Vocabulaire supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du vocabulaire' });
  }
};

async function cleanFile(filename) {
  try {
    if (!filename) return;
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Silent error handling to avoid logging
    }
  }
}