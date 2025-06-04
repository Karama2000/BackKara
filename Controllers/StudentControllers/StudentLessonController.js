const mongoose = require('mongoose');
const Lesson = require('../../Models/TeacherModels/Lesson');
const Progress = require('../../Models/StudentModels/Progress');
const Parent = require('../../Models/AdminModels/Parent');
const Notification = require('../../Models/SystemeNotif/Notification');

exports.getStudentLessons = async (req, res) => {
  try {
    const student = req.user;
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const [lessons, progress] = await Promise.all([
      Lesson.find()
        .populate({
          path: 'programId',
          match: {
            $or: [{ niveauId: student.niveau }, { classeId: student.classe }],
          },
          select: 'title niveauId classeId',
        })
        .populate('unitId', 'title')
        .populate({
          path: 'tests',
          select: 'title content mediaFile',
          populate: [
            { path: 'programId', select: 'title' },
            { path: 'unitId', select: 'title' },
          ],
        })
        .lean(),
      Progress.find({ studentId: student._id }).lean(),
    ]);

    const filteredLessons = lessons.filter((lesson) => lesson.programId);
    const progressMap = progress.reduce((map, prog) => {
      map[prog.lessonId.toString()] = prog;
      return map;
    }, {});

    const lessonsWithProgress = filteredLessons.map((lesson) => ({
      ...lesson,
      progress: progressMap[lesson._id.toString()] || {
        status: 'not_started',
        currentPage: 1,
        notes: '',
        completionDate: null,
      },
    }));

    res.status(200).json(lessonsWithProgress);
  } catch (error) {
    console.error('Erreur lors de la récupération des leçons:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

exports.updateLessonProgress = async (req, res) => {
  try {
    const student = req.user;
    const { lessonId, status, notes, currentPage } = req.body;

    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'ID de leçon invalide.' });
    }

    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    if (!Number.isInteger(currentPage) || currentPage < 1) {
      return res.status(400).json({ message: 'Page courante invalide.' });
    }

    const lesson = await Lesson.findById(lessonId).populate({
      path: 'programId',
      match: {
        $or: [{ niveauId: student.niveau }, { classeId: student.classe }],
      },
    });
    if (!lesson || !lesson.programId) {
      return res.status(404).json({ message: 'Leçon non trouvée ou non accessible.' });
    }

    if (status === 'completed' && currentPage < lesson.totalPages) {
      return res.status(400).json({ message: 'Vous devez atteindre la dernière page pour marquer comme terminé.' });
    }

    const progress = await Progress.findOneAndUpdate(
      { studentId: student._id, lessonId },
      {
        status,
        notes: notes?.trim() || '',
        currentPage,
        completionDate: status === 'completed' ? new Date() : null,
      },
      { upsert: true, new: true }
    );

    const parents = await Parent.find({ enfants: student._id });
    await Promise.all(
      parents.map((parent) =>
        new Notification({
          userId: parent._id,
          type: 'lesson_progress',
          message: `Votre enfant ${student.prenom} ${student.nom} a mis à jour sa progression dans la leçon "${lesson.title}" (Statut: ${status}).`,
          relatedId: progress._id,
          relatedModel: 'Progress',
          createdAt: new Date(),
        }).save()
      )
    );

    res.status(200).json({
      ...progress.toObject(),
      completionDate: progress.completionDate ? new Date(progress.completionDate).toISOString() : null,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};