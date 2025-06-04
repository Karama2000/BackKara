const Lesson = require('../../Models/TeacherModels/Lesson');
const Test = require('../../Models/TeacherModels/Test'); // Added import for Test model
const mongoose = require('mongoose');
const Notification = require('../../Models/SystemeNotif/Notification'); // Add this import
// Get all lessons for the authenticated teacher
exports.getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({ teacherId: req.user._id })
      .populate('programId', 'title niveauId')
      .populate('unitId', 'title')
      .populate({
        path: 'tests',
        select: 'title content mediaFile',
        populate: [
          { path: 'programId', select: 'title' },
          { path: 'unitId', select: 'title' },
        ],
      });
    res.status(200).json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des leçons.' });
  }
};

// Estimate pages for text content (e.g., 500 characters per page)
const estimateTextPages = (content) => {
  if (!content) return 1;
  const charsPerPage = 500; // Adjust as needed
  return Math.ceil(content.length / charsPerPage) || 1;
};

exports.createLesson = async (req, res) => {
  try {
    const { programId, unitId, title, content } = req.body;
    const mediaFile = req.file ? req.file.filename : null;
    const totalPages = mediaFile ? 1 : estimateTextPages(content); // Default to 1 for PDFs, update later

    if (!mongoose.Types.ObjectId.isValid(programId) || !mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ message: 'Program ID ou Unit ID invalide.' });
    }

    const lesson = new Lesson({
      programId,
      unitId,
      title,
      content,
      mediaFile,
      totalPages,
      teacherId: req.user._id,
    });

    await lesson.save();
    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('programId', 'title niveauId')
      .populate('unitId', 'title');

    // Notify students
    const program = await mongoose.model('Program').findById(programId);
    const students = await mongoose.model('User').find({
      __t: 'Eleve',
      niveau: program.niveauId,
    });

    const notifications = students.map((student) => ({
      userId: student._id,
      type: 'lesson_added',
      message: `Nouvelle leçon ajoutée : ${title}`,
      relatedId: lesson._id,
      relatedModel: 'Lesson',
    }));

    await Notification.insertMany(notifications);

    res.status(201).json(populatedLesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la leçon.' });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { programId, unitId, title, content } = req.body;
    const mediaFile = req.file ? req.file.filename : req.body.mediaFile;
    const totalPages = req.file ? 1 : estimateTextPages(content); // Default to 1 for PDFs

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Lesson ID invalide.' });
    }

    const lesson = await Lesson.findOne({ _id: id, teacherId: req.user._id });
    if (!lesson) {
      return res.status(404).json({ message: 'Leçon non trouvée ou non autorisée.' });
    }

    lesson.programId = programId || lesson.programId;
    lesson.unitId = unitId || lesson.unitId;
    lesson.title = title || lesson.title;
    lesson.content = content || lesson.content;
    lesson.mediaFile = mediaFile || lesson.mediaFile;
    lesson.totalPages = totalPages || lesson.totalPages;

    await lesson.save();
    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('programId', 'title niveauId')
      .populate('unitId', 'title')
      .populate({
        path: 'tests',
        select: 'title content mediaFile',
        populate: [
          { path: 'programId', select: 'title' },
          { path: 'unitId', select: 'title' },
        ],
      });
    res.status(200).json(populatedLesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la leçon.' });
  }
};

// Controllers/TeacherControllers/LessonController.js
exports.updateLessonPages = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalPages } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Lesson ID invalide.' });
    }

    if (!Number.isInteger(totalPages) || totalPages < 1) {
      return res.status(400).json({ message: 'Nombre de pages invalide.' });
    }

    const lesson = await Lesson.findOne({ _id: id, teacherId: req.user._id });
    if (!lesson) {
      return res.status(404).json({ message: 'Leçon non trouvée ou non autorisée.' });
    }

    lesson.totalPages = totalPages;
    await lesson.save();

    res.status(200).json({ message: 'Nombre de pages mis à jour.' });
  } catch (error) {
    console.error('Error updating lesson pages:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour des pages.' });
  }
};
// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Lesson ID invalide.' });
    }

    const lesson = await Lesson.findOne({ _id: id, teacherId: req.user._id });
    if (!lesson) {
      return res.status(404).json({ message: 'Leçon non trouvée ou non autorisée.' });
    }

    // Delete associated tests
    await Test.deleteMany({ lessonId: id });

    await lesson.deleteOne();
    res.status(200).json({ message: 'Leçon et tests associés supprimés avec succès.' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la leçon.' });
  }
};