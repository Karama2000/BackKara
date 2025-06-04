const mongoose = require('mongoose');
const Parent = require('../../Models/AdminModels/Parent');
const Eleve = require('../../Models/AdminModels/Eleve');
const Progress = require('../../Models/StudentModels/Progress');
const QuizSubmission = require('../../Models/StudentModels/QuizSubmission');
const TestSubmission = require('../../Models/StudentModels/TestSubmission');
const Notification = require('../../Models/SystemeNotif/Notification');

// Récupérer les progrès des enfants d'un parent
exports.getChildrenProgress = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user._id).populate({
      path: 'enfants',
      populate: [
        { path: 'niveau', select: 'nom' },
        { path: 'classe', select: 'nom' },
      ],
    });
    if (!parent) {
      return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    const childrenIds =
      parent.enfants && parent.enfants.length > 0
        ? parent.enfants.map((child) => child._id)
        : [];

    // Récupérer les progrès des leçons
    const lessonsProgress = await Progress.find({
      studentId: { $in: childrenIds },
    })
      .populate('lessonId', 'title')
      .lean();

    // Récupérer les soumissions de quiz
    const quizSubmissions = await QuizSubmission.find({
      studentId: { $in: childrenIds },
    })
      .populate('quizId', 'titre difficulty')
      .lean();

    // Récupérer les soumissions de tests
    const testSubmissions = await TestSubmission.find({
      studentId: { $in: childrenIds },
    })
      .populate('testId', 'title')
      .lean();

    // Organiser les données par enfant
    const childrenProgress =
      parent.enfants && parent.enfants.length > 0
        ? parent.enfants.map((child) => ({
            childId: child._id,
            nom: child.nom,
            prenom: child.prenom,
            niveau: child.niveau?.nom || 'N/A',
            classe: child.classe?.nom || 'N/A',
            numInscript: child.numInscript || 'N/A',
            lessons: lessonsProgress
              .filter((p) => p.studentId.toString() === child._id.toString())
              .map((p) => ({
                lessonId: p.lessonId?._id,
                title: p.lessonId?.title || 'N/A',
                status: p.status,
                currentPage: p.currentPage,
                completionDate: p.completionDate,
              })),
            quizzes: quizSubmissions
              .filter((q) => q.studentId.toString() === child._id.toString())
              .map((q) => ({
                quizId: q.quizId?._id,
                title: q.quizId?.titre || 'N/A',
                difficulty: q.quizId?.difficulty || 'N/A',
                score: q.score,
                percentage: q.percentage,
                submittedAt: q.submittedAt,
              })),
            tests: testSubmissions
              .filter((t) => t.studentId.toString() === child._id.toString())
              .map((t) => ({
                testId: t.testId?._id,
                title: t.testId?.title || 'N/A',
                status: t.status,
                feedback: t.feedback,
                submittedAt: t.submittedAt,
              })),
          }))
        : [];

    res.status(200).json(childrenProgress);
  } catch (error) {
    console.error('Erreur lors de la récupération des progrès des enfants:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Récupérer les notifications du parent
// ... (other exports remain the same)

  // Récupérer les notifications du parent
  exports.getParentNotifications = async (req, res) => {
    try {
      console.log('Fetching notifications for user ID:', req.user._id);
      const notifications = await Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      console.log('Notifications found:', notifications);
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
  };

// Marquer une notification comme lue
exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée.' });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Supprimer une notification
exports.deleteParentNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée.' });
    }
    res.status(200).json({ message: 'Notification supprimée.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Supprimer toutes les notifications du parent
exports.deleteAllParentNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.status(200).json({ message: 'Toutes les notifications ont été supprimées.' });
  } catch (error) {
    console.error('Erreur lors de la suppression des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};