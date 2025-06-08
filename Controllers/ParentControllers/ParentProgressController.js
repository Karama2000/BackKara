const mongoose = require('mongoose');
const Parent = require('../../Models/AdminModels/Parent');
const Eleve = require('../../Models/AdminModels/Eleve');
const Progress = require('../../Models/StudentModels/Progress');
const QuizSubmission = require('../../Models/StudentModels/QuizSubmission');
const TestSubmission = require('../../Models/StudentModels/TestSubmission');
const Notification = require('../../Models/SystemeNotif/Notification');

// Fetch children for a parent
exports.getChildren = async (req, res) => {
  try {
    console.log('Fetching children for user ID:', req.user._id);
    const parent = await Parent.findById(req.user._id).populate({
      path: 'enfants',
      populate: [
        { path: 'niveau', select: 'nom' },
        { path: 'classe', select: 'nom' },
      ],
    });

    if (!parent) {
      console.log('Parent not found for ID:', req.user._id);
      return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    console.log('Parent document:', parent);
    const children = parent.enfants && parent.enfants.length > 0
      ? parent.enfants.map((child) => ({
          _id: child._id,
          nom: child.nom,
          prenom: child.prenom,
          niveau: child.niveau?.nom || 'N/A',
          classe: child.classe?.nom || 'N/A',
          numInscript: child.numInscript || 'N/A',
          imageUrl: child.imageUrl ? `${req.protocol}://${req.get('host')}/Uploads/${child.imageUrl}` : null,
        }))
      : [];

    console.log('Children retrieved:', children);
    res.status(200).json(children);
  } catch (error) {
    console.error('Erreur lors de la récupération des enfants:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Fetch progress of parent's children
exports.getChildrenProgress = async (req, res) => {
  try {
    // Fetch parent with children
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

    const childrenIds = parent.enfants?.length > 0 ? parent.enfants.map((child) => child._id) : [];
    console.log('Children IDs:', childrenIds);

    // Validate children data
    if (parent.enfants?.length > 0) {
      parent.enfants.forEach((child) => {
        if (!child.nom || !child.prenom) {
          console.warn(`Child ${child._id} has missing nom or prenom:`, child);
        }
        if (!child.niveau || !child.classe) {
          console.warn(`Child ${child._id} has missing niveau or classe:`, child);
        }
      });
    } else {
      console.warn('No enfants found for parent:', req.user._id);
    }

    // Fetch progress data with stricter population checks
    const lessonsProgress = await Progress.find({ studentId: { $in: childrenIds } })
      .populate({
        path: 'lessonId',
        select: 'title',
        options: { strictPopulate: false },
      })
      .lean();

    const quizSubmissions = await QuizSubmission.find({
      studentId: { $in: childrenIds },
      quizId: { $exists: true, $ne: null },
    })
      .populate({
        path: 'quizId',
        select: 'titre difficulty',
        options: { strictPopulate: false },
      })
      .lean();

    const testSubmissions = await TestSubmission.find({
      studentId: { $in: childrenIds },
      testId: { $exists: true, $ne: null },
    })
      .populate({
        path: 'testId',
        select: 'title',
        options: { strictPopulate: false },
      })
      .lean();

    // Log missing or invalid references
    lessonsProgress.forEach((p) => {
      if (!p.lessonId || !p.lessonId.title) {
        console.warn(`Lesson progress ${p._id} has no valid lessonId or title:`, p);
      }
    });
    quizSubmissions.forEach((q) => {
      if (!q.quizId || !q.quizId.titre) {
        console.warn(`Quiz submission ${q._id} has no valid quizId or titre:`, q);
      }
    });
    testSubmissions.forEach((t) => {
      if (!t.testId || !t.testId.title) {
        console.warn(`Test submission ${t._id} has no valid testId or title:`, t);
      }
    });

    // Organize data by child
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
              title: p.lessonId?.title || 'Leçon supprimée ou non disponible',
              status: p.status || 'inconnu',
              currentPage: p.currentPage || 0,
              completionDate: p.completionDate,
            })),
          quizzes: quizSubmissions
            .filter((q) => q.studentId && q.studentId.toString() === child._id.toString())
            .map((q) => ({
              quizId: q.quizId?._id || 'N/A',
              title: q.quizId?.titre || 'Quiz supprimé ou non disponible',
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
              title: t.testId?.title || 'Test supprimé ou non disponible',
              status: t.status || 'inconnu',
              feedback: t.feedback || 'Aucun feedback',
              submittedAt: t.submittedAt,
            })),
        }))
      : [];

    console.log('Final children progress:', JSON.stringify(childrenProgress, null, 2));
    res.status(200).json(childrenProgress);
  } catch (error) {
    console.error('Erreur lors de la récupération des progrès des enfants:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Delete progress of parent's children
exports.deleteChildrenProgress = async (req, res) => {
  try {
    console.log('Deleting progress for parent ID:', req.user._id);
    const parent = await Parent.findById(req.user._id).select('enfants');
    if (!parent) {
      console.log('Parent not found for ID:', req.user._id);
      return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    const childrenIds = parent.enfants?.length > 0 ? parent.enfants.map((child) => child._id) : [];
    console.log('Children IDs for deletion:', childrenIds);

    if (childrenIds.length === 0) {
      console.log('No children found for parent:', req.user._id);
      return res.status(400).json({ message: 'Aucun enfant associé à ce parent.' });
    }

    // Delete progress records
    const [lessonsDeleted, quizzesDeleted, testsDeleted] = await Promise.all([
      Progress.deleteMany({ studentId: { $in: childrenIds } }),
      QuizSubmission.deleteMany({ studentId: { $in: childrenIds } }),
      TestSubmission.deleteMany({ studentId: { $in: childrenIds } }),
    ]);

    console.log('Deletion results:', {
      lessonsDeleted: lessonsDeleted.deletedCount,
      quizzesDeleted: quizzesDeleted.deletedCount,
      testsDeleted: testsDeleted.deletedCount,
    });

    res.status(200).json({
      message: 'Progrès des enfants supprimés avec succès.',
      details: {
        lessonsDeleted: lessonsDeleted.deletedCount,
        quizzesDeleted: quizzesDeleted.deletedCount,
        testsDeleted: testsDeleted.deletedCount,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des progrès des enfants:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Fetch parent notifications
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

// Mark a notification as read
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

// Delete a notification
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

// Delete all notifications for a parent
exports.deleteAllParentNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.status(200).json({ message: 'Toutes les notifications ont été supprimées.' });
  } catch (error) {
    console.error('Erreur lors de la suppression des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};