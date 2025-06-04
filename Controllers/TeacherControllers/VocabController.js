
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const Vocabulary = require('../../Models/TeacherModels/Vocab');

// Option 1: Use project-relative Uploads directory
const UPLOADS_DIR = path.join(__dirname, '../Uploads');
// Option 2: Use local directory (uncomment to use)
// const UPLOADS_DIR = 'C:\\Dev_Web_Uploads';

console.log(`VocabController configured UPLOADS_DIR: ${UPLOADS_DIR}`);

exports.getAllVocab = async (req, res) => {
  try {
    const vocab = await Vocabulary.find({ teacherId: req.user._id }).populate('categorieId', 'nom');
    res.status(200).json(vocab);
  } catch (error) {
    console.error('VocabController: Error fetching vocab:', error);
    res.status(500).json({ message: 'Error fetching vocabulary.' });
  }
};

exports.createVocab = async (req, res) => {
  try {
    const { mot, categorieId, existingImage, existingAudio } = req.body;
    const imageFile = req.files?.image?.[0]; // Changé de imageUrl à image
    const audioFile = req.files?.audio?.[0];

    console.log('VocabController: Received createVocab request:', {
      mot,
      categorieId,
      imageFile: imageFile ? { filename: imageFile.filename, path: imageFile.path, size: imageFile.size } : null,
      audioFile: audioFile ? { filename: audioFile.filename, path: audioFile.path, size: audioFile.size } : null,
      existingImage,
      existingAudio,
    });

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

    // Vérifier l'existence du fichier audio sur le disque
    if (audioFile) {
      const audioPath = path.join(UPLOADS_DIR, audioFile.filename);
      try {
        await fs.access(audioPath, fs.constants.F_OK | fs.constants.R_OK);
        console.log(`VocabController: Fichier audio confirmé sur le disque: ${audioPath} (taille: ${audioFile.size} octets)`);
      } catch (err) {
        console.error(`VocabController: Fichier audio introuvable sur le disque: ${audioPath}`, err);
        if (imageFile) await cleanFile(imageFile.filename);
        return res.status(500).json({ message: `Échec du téléversement du fichier audio: ${err.message}` });
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
    console.log('VocabController: Vocabulaire sauvegardé:', {
      _id: populatedVocab._id,
      mot: populatedVocab.mot,
      imageUrl: populatedVocab.imageUrl,
      audioUrl: populatedVocab.audioUrl,
    });

    res.status(201).json(populatedVocab);
  } catch (error) {
    console.error('VocabController: Erreur lors de la création du vocabulaire:', error);
    if (req.files?.image) await cleanFile(req.files.image[0].filename); // Changé de imageUrl à image
    if (req.files?.audio) await cleanFile(req.files.audio[0].filename);
    res.status(500).json({ message: error.message || 'Erreur lors de la création du vocabulaire' });
  }
};

exports.updateVocab = async (req, res) => {
  try {
    const { id } = req.params;
    const { mot, categorieId, existingImage, existingAudio } = req.body;
    const imageFile = req.files?.image?.[0]; // Changé de imageUrl à image
    const audioFile = req.files?.audio?.[0];

    console.log('VocabController: Received updateVocab request:', {
      id,
      mot,
      categorieId,
      imageFile: imageFile ? { filename: imageFile.filename, path: imageFile.path, size: imageFile.size } : null,
      audioFile: audioFile ? { filename: audioFile.filename, path: audioFile.path, size: audioFile.size } : null,
      existingImage,
      existingAudio,
    });

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
        await fs.access(audioPath, fs.constants.F_OK | fs.constants.R_OK);
        console.log(`VocabController: Fichier audio confirmé sur le disque: ${audioPath} (taille: ${audioFile.size} octets)`);
      } catch (err) {
        console.error(`VocabController: Fichier audio introuvable sur le disque: ${audioPath}`, err);
        if (imageFile) await cleanFile(imageFile.filename);
        return res.status(500).json({ message: `Échec du téléversement du fichier audio: ${err.message}` });
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
    console.log('VocabController: Vocabulaire mis à jour:', {
      _id: populatedVocab._id,
      mot: populatedVocab.mot,
      imageUrl: populatedVocab.imageUrl,
      audioUrl: populatedVocab.audioUrl,
    });

    res.status(200).json(populatedVocab);
  } catch (error) {
    console.error('VocabController: Erreur lors de la mise à jour du vocabulaire:', error);
    if (req.files?.image) await cleanFile(req.files.image[0].filename); // Changé de imageUrl à image
    if (req.files?.audio) await cleanFile(req.files.audio[0].filename);
    res.status(500).json({ message: error.message || 'Erreur lors de la mise à jour du vocabulaire' });
  }
};

exports.deleteVocab = async (req, res) => {
  try {
    const { id } = req.params;
    const vocab = await Vocabulary.findOneAndDelete({ _id: id, teacherId: req.user._id });
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }

    if (vocab.imageUrl) {
      await cleanFile(vocab.imageUrl);
    }
    if (vocab.audioUrl) {
      await cleanFile(vocab.audioUrl);
    }

    console.log('VocabController: Vocab deleted:', id);
    res.status(200).json({ message: 'Vocabulary deleted' });
  } catch (error) {
    console.error('VocabController: Error deleting vocab:', error);
    res.status(500).json({ message: 'Error deleting vocab' });
  }
};

async function cleanFile(filename) {
  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.unlink(filePath);
    console.log(`VocabController: Deleted file: ${filePath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`VocabController: Error deleting file ${filename}:`, err);
    }
  }
}
