const mongoose = require('mongoose');
const Test = require('../../Models/TeacherModels/Test');
const TestSubmission = require('../../Models/StudentModels/TestSubmission');
const Parent = require('../../Models/AdminModels/Parent');
const Notification = require('../../Models/SystemeNotif/Notification');

exports.getStudentTests = async (req, res) => {
  try {
    const student = req.user;
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const [tests, submissions] = await Promise.all([
      Test.find()
        .populate({
          path: 'programId',
          match: { niveauId: student.niveau },
          select: 'title niveauId',
        })
        .populate('lessonId', 'title')
        .populate('unitId', 'title')
        .lean(),
      TestSubmission.find({ studentId: student._id })
        .select('testId status feedback submittedFile submittedAt')
        .lean(),
    ]);

    const filteredTests = tests.filter((test) => test.programId);
    const testsWithStatus = filteredTests.map((test) => {
      const submission = submissions.find((sub) => sub.testId.toString() === test._id.toString());
      return {
        ...test,
        submission: submission
          ? {
              status: submission.status,
              feedback: submission.feedback || 'Aucun feedback',
              submittedFile: submission.submittedFile || null,
              submittedAt: submission.submittedAt ? new Date(submission.submittedAt).toISOString() : null,
            }
          : null,
      };
    });

    res.status(200).json(testsWithStatus);
  } catch (error) {
    console.error('Erreur lors de la récupération des tests:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const student = req.user;
    console.log('Authenticated student:', {
      id: student._id.toString(),
      prenom: student.prenom,
      nom: student.nom,
      type: student.__t
    });
    if (student.__t !== 'Eleve') {
      console.error('Unauthorized access: User is not a student');
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const { testId } = req.body;
    const submittedFile = req.file?.filename;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      console.error('Invalid test ID:', testId);
      return res.status(400).json({ message: 'ID de test invalide.' });
    }

    if (!submittedFile) {
      console.error('No file submitted for test:', testId);
      return res.status(400).json({ message: 'Aucun fichier soumis.' });
    }

    const allowedFileTypes = ['image/jpeg', 'image/png', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedFileTypes.includes(req.file.mimetype)) {
      console.error('Unsupported file type:', req.file.mimetype);
      return res.status(400).json({ message: 'Type de fichier non supporté.' });
    }

    const test = await Test.findById(testId).populate({
      path: 'programId',
      match: { niveauId: student.niveau },
    });
    if (!test || !test.programId) {
      console.error('Test not found or unauthorized for student level:', { testId, studentNiveau: student.niveau });
      return res.status(404).json({ message: 'Test non trouvé ou non autorisé pour votre niveau.' });
    }
    console.log('Test found:', { id: test._id.toString(), title: test.title });

    const existingSubmission = await TestSubmission.findOne({ testId, studentId: student._id });
    if (existingSubmission) {
      console.error('Test already submitted:', { testId, studentId: student._id.toString() });
      return res.status(400).json({ message: 'Vous avez déjà soumis ce test.' });
    }

    const submission = new TestSubmission({
      testId,
      studentId: student._id,
      submittedFile,
      status: 'submitted', // Changed from 'soumis' to 'submitted' to match enum
      submittedAt: new Date(),
    });
    console.log('Attempting to save submission:', {
      testId: testId.toString(),
      studentId: student._id.toString(),
      submittedFile,
      status: 'submitted'
    });
    await submission.save();
    console.log('Submission saved:', { id: submission._id.toString() });

    // Fetch parents linked to the student
    const parents = await Parent.find({ enfants: student._id });
    if (!parents || parents.length === 0) {
      console.warn(`No parents linked to student ${student._id.toString()}. Verify 'enfants' field in Parent model.`);
    } else {
      console.log('Parents found:', parents.map((p) => ({
        id: p._id.toString(),
        prenom: p.prenom,
        nom: p.nom
      })));
    }

    // Create notifications for parents
    const notificationErrors = [];
    const notificationsCreated = [];
    for (const parent of parents) {
      try {
        const notification = new Notification({
          userId: parent._id,
          type: 'test_submitted',
          message: `Votre enfant ${student.prenom} ${student.nom} a soumis le test "${test.title}".`,
          relatedId: submission._id,
          relatedModel: 'TestSubmission',
          read: false,
          createdAt: new Date(),
        });
        console.log('Attempting to save parent notification:', {
          parentId: parent._id.toString(),
          notification: {
            userId: notification.userId.toString(),
            type: notification.type,
            message: notification.message,
            relatedId: notification.relatedId.toString(),
            relatedModel: notification.relatedModel
          }
        });
        await notification.save();
        console.log('Parent notification saved:', { id: notification._id.toString(), parentId: parent._id.toString() });
        notificationsCreated.push(notification._id.toString());
      } catch (err) {
        console.error(`Failed to save notification for parent ${parent._id.toString()}:`, err.message);
        notificationErrors.push(`Failed to save notification for parent ${parent._id.toString()}: ${err.message}`);
      }
    }

    // Create notification for teacher
    try {
      const teacherNotification = new Notification({
        userId: test.teacherId,
        type: 'test_submitted',
        message: `L'élève ${student.prenom} ${student.nom} a soumis le test "${test.title}".`,
        relatedId: submission._id,
        relatedModel: 'TestSubmission',
        read: false,
        createdAt: new Date(),
      });
      console.log('Attempting to save teacher notification:', {
        teacherId: test.teacherId.toString(),
        notification: {
          userId: teacherNotification.userId.toString(),
          type: teacherNotification.type,
          message: teacherNotification.message,
          relatedId: teacherNotification.relatedId.toString(),
          relatedModel: teacherNotification.relatedModel
        }
      });
      await teacherNotification.save();
      console.log('Teacher notification saved:', { id: teacherNotification._id.toString(), teacherId: test.teacherId.toString() });
      notificationsCreated.push(teacherNotification._id.toString());
    } catch (err) {
      console.error(`Failed to save notification for teacher ${test.teacherId.toString()}:`, err.message);
      notificationErrors.push(`Failed to save notification for teacher ${test.teacherId.toString()}: ${err.message}`);
    }

    if (notificationErrors.length > 0) {
      console.warn('Some notifications failed to save:', notificationErrors);
    }

    const populatedSubmission = await TestSubmission.findById(submission._id)
      .populate('testId', 'title')
      .lean();

    res.status(201).json({
      ...populatedSubmission,
      submittedAt: populatedSubmission.submittedAt ? new Date(populatedSubmission.submittedAt).toISOString() : null,
      notificationsCreated: notificationsCreated.length,
      notificationWarnings: notificationErrors.length > 0 ? notificationErrors.join('; ') : undefined
    });
  } catch (error) {
    console.error('Erreur lors de la soumission du test:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};