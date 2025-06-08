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
    // Récupérer le parent avec ses enfants
    const parent = await Parent.findById(req.user._id).populate({
      path: 'enfants',
      populate: [
        { path: 'niveau', select: 'nom' },
        { path: 'classe', select: 'nom' },
      ],
    });

    if (!parent) {
      console.log('Parent not found for user:', req.user._id);
      return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    // Vérifier les enfants
    const childrenIds = parent.enfants?.length > 0 ? parent.enfants.map((child) => child._id) : [];
    console.log('Children IDs:', childrenIds);
    console.log('Children details:', parent.enfants.map(child => ({
      _id: child._id,
      nom: child.nom,
      prenom: child.prenom,
      niveau: child.niveau?.nom,
      classe: child.classe?.nom
    })));

    // Validation des enfants
    if (parent.enfants?.length > 0) {
      parent.enfants.forEach((child) => {
        if (!child.nom || !child.prenom) {
          console.warn(`Child ${child._id} has missing nom or prenom:`, child);
        }
      });
    } else {
      console.warn('No enfants found for parent:', req.user._id);
    }

    // Récupérer les progrès des leçons
    const lessonsProgress = await Progress.find({ studentId: { $in: childrenIds } })
      .populate('lessonId', 'title')
      .lean();
    console.log('Lessons progress:', lessonsProgress.map(p => ({
      studentId: p.studentId,
      lessonId: p.lessonId?._id,
      title: p.lessonId?.title
    })));

    // Récupérer les soumissions de quiz
    const quizSubmissions = await QuizSubmission.find({ studentId: { $in: childrenIds } })
      .populate('quizId', 'titre difficulty')
      .lean();
    console.log('Quiz submissions:', quizSubmissions.map(q => ({
      studentId: q.studentId,
      quizId: q.quizId?._id,
      titre: q.quizId?.titre,
      difficulty: q.quizId?.difficulty
    })));

    // Récupérer les soumissions de tests
    const testSubmissions = await TestSubmission.find({ studentId: { $in: childrenIds } })
      .populate('testId', 'title')
      .lean();
    console.log('Test submissions:', testSubmissions.map(t => ({
      studentId: t.studentId,
      testId: t.testId?._id,
      title: t.testId?.title
    })));

    // Organiser les données par enfant
    const childrenProgress = parent.enfants?.length > 0
      ? parent.enfants.map((child) => ({
          childId: child._id,
          nom: child.nom || 'Nom non spécifié',
          prenom: child.prenom || 'Prénom non spécifié',
          niveau: child.niveau?.nom || 'Non spécifié',
          classe: child.classe?.nom || 'Non spécifié',
          numInscript: child.numInscript || 'Non spécifié',
          lessons: lessonsProgress
            .filter((p) => p.studentId && p.studentId.toString() === child._id.toString())
            .map((p) => ({
              lessonId: p.lessonId?._id || 'N/A',
              title: p.lessonId?.title || 'Titre non disponible',
              status: p.status || 'inconnu',
              currentPage: p.currentPage || 0,
              completionDate: p.completionDate,
            })),
          quizzes: quizSubmissions
            .filter((q) => q.studentId && q.studentId.toString() === child._id.toString())
            .map((q) => ({
              quizId: q.quizId?._id || 'N/A',
              title: q.quizId?.titre || 'Titre non disponible',
              difficulty: q.quizId?.difficulty || 'Inconnu',
              score: q.score || 0,
              total: q.total || 0,
              percentage: q.percentage || 0,
              submittedAt: q.submittedAt,
            })),
          tests: testSubmissions
            .filter((t) => t.studentId && t.studentId.toString() === child._id.toString())
            .map((t) => ({
              testId: t.testId?._id || 'N/A',
              title: t.testId?.title || 'Titre non disponible',
              status: t.status || 'inconnu',
              feedback: t.feedback || 'Aucun feedback',
              submittedAt: t.submittedAt,
            })),
        }))
      : [];

    console.log('Final children progress:', childrenProgress);
    res.status(200).json(childrenProgress);
  } catch (error) {
    console.error('Erreur lors de la récupération des progrès des enfants:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

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