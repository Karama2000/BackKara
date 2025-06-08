const mongoose = require('mongoose');
const Test = require('../../Models/TeacherModels/Test');
const TestSubmission = require('../../Models/StudentModels/TestSubmission');
const Parent = require('../../Models/AdminModels/Parent');
const Notification = require('../../Models/SystemeNotif/Notification');
const fs = require('fs').promises;
const path = require('path');

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
        .select('testId status feedback submittedFile submittedAt correctionFile _id')
        .lean(),
    ]);

    const filteredTests = tests.filter((test) => test.programId);
    const testsWithStatus = filteredTests.map((test) => {
      const submission = submissions.find((sub) => sub.testId && sub.testId.toString() === test._id.toString());
      return {
        ...test,
        submission: submission
          ? {
              _id: submission._id,
              status: submission.status,
              feedback: submission.feedback || 'Aucun feedback',
              submittedFile: submission.submittedFile || null,
              correctionFile: submission.correctionFile || null,
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
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const { testId } = req.body;
    const submittedFile = req.file?.filename;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: 'ID de test invalide.' });
    }

    if (!submittedFile) {
      return res.status(400).json({ message: 'Aucun fichier soumis.' });
    }

    const allowedFileTypes = ['image/jpeg', 'image/png', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedFileTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Type de fichier non supporté.' });
    }

    const test = await Test.findById(testId).populate({
      path: 'programId',
      match: { niveauId: student.niveau },
    });
    if (!test || !test.programId) {
      return res.status(404).json({ message: 'Test non trouvé ou non autorisé pour votre niveau.' });
    }

    const existingSubmission = await TestSubmission.findOne({ testId, studentId: student._id });
    if (existingSubmission) {
      return res.status(400).json({ message: 'Vous avez déjà soumis ce test.' });
    }

    const submission = new TestSubmission({
      testId,
      studentId: student._id,
      submittedFile,
      status: 'submitted',
      submittedAt: new Date(),
    });

    await submission.save();

    const parents = await Parent.find({ enfants: student._id });
    const notifications = parents.map((parent) => ({
      userId: parent._id,
      type: 'test_submitted',
      message: `Votre enfant a soumis le test "${test.title}".`,
      relatedId: submission._id,
      relatedModel: 'TestSubmission',
    }));
    await Notification.insertMany(notifications);

    const teacherNotification = new Notification({
      userId: test.teacherId,
      type: 'test_submitted',
      message: `Une nouvelle soumission a été reçue pour le test "${test.title}".`,
      relatedId: submission._id,
      relatedModel: 'TestSubmission',
    });
    await teacherNotification.save();

    const populatedSubmission = await TestSubmission.findById(submission._id)
      .populate('testId', 'title')
      .lean();

    res.status(201).json({
      ...populatedSubmission,
      submittedAt: populatedSubmission.submittedAt ? new Date(populatedSubmission.submittedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('Erreur lors de la soumission du test:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Dans StudentTestController.js

// Mettre à jour une soumission
exports.updateSubmission = async (req, res) => {
  try {
    console.log('updateSubmission function started', { submissionId: req.params.submissionId, userId: req.user?._id });

    const student = req.user;
    if (!student || student.__t !== 'Eleve') {
      console.log('Unauthorized access: Not a student', { user: student });
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const { submissionId } = req.params;
    const { testId } = req.body;
    const submittedFile = req.file?.filename;

    if (!mongoose.Types.ObjectId.isValid(submissionId) || !mongoose.Types.ObjectId.isValid(testId)) {
      console.log('Invalid ID', { submissionId, testId });
      return res.status(400).json({ message: 'ID de soumission ou de test invalide.' });
    }

    if (!submittedFile) {
      console.log('No file submitted');
      return res.status(400).json({ message: 'Aucun fichier soumis.' });
    }

    const allowedFileTypes = ['image/jpeg', 'image/png', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedFileTypes.includes(req.file.mimetype)) {
      console.log('Unsupported file type', { mimetype: req.file.mimetype });
      return res.status(400).json({ message: 'Type de fichier non supporté.' });
    }

    const submission = await TestSubmission.findOne({ _id: submissionId, studentId: student._id });
    if (!submission) {
      console.log('Submission not found or unauthorized', { submissionId, studentId: student._id });
      return res.status(404).json({ message: 'Soumission non trouvée ou non autorisée.' });
    }

    if (submission.status === 'corrected') {
      console.log('Cannot update corrected submission', { submissionId });
      return res.status(400).json({ message: 'Impossible de modifier une soumission corrigée.' });
    }

    const test = await Test.findById(testId).populate({
      path: 'programId',
      match: { niveauId: student.niveau },
    });
    if (!test || !test.programId) {
      console.log('Test not found or unauthorized', { testId, studentNiveau: student.niveau });
      return res.status(404).json({ message: 'Test non trouvé ou non autorisé pour votre niveau.' });
    }

    // Delete old file if it exists
    if (submission.submittedFile) {
      const oldFilePath = path.join(__dirname, '../../Uploads', submission.submittedFile);
      try {
        await fs.unlink(oldFilePath);
        console.log('Old file deleted:', submission.submittedFile);
      } catch (err) {
        console.warn('Error deleting old file:', err.message);
      }
    }

    submission.submittedFile = submittedFile;
    submission.submittedAt = new Date();
    submission.status = 'submitted';
    submission.feedback = null;
    submission.correctionFile = null;

    await submission.save();
    console.log('Submission updated:', submissionId);

    const parents = await Parent.find({ enfants: student._id });
    const notifications = parents.map((parent) => ({
      userId: parent._id,
      type: 'test_submission_updated',
      message: `Votre enfant a mis à jour sa soumission pour le test "${test.title}".`,
      relatedId: submission._id,
      relatedModel: 'TestSubmission',
    }));
    await Notification.insertMany(notifications);

    const teacherNotification = new Notification({
      userId: test.teacherId,
      type: 'test_submission_updated',
      message: `Une soumission a été mise à jour pour le test "${test.title}".`,
      relatedId: submission._id,
      relatedModel: 'TestSubmission',
    });
    await teacherNotification.save();

    const populatedSubmission = await TestSubmission.findById(submission._id)
      .populate('testId', 'title')
      .lean();

    res.status(200).json({
      ...populatedSubmission,
      submittedAt: populatedSubmission.submittedAt ? new Date(populatedSubmission.submittedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('Error in updateSubmission:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// Supprimer une soumission
exports.deleteSubmission = async (req, res) => {
  try {
    const student = req.user;
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const { submissionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: 'ID de soumission invalide.' });
    }

    const submission = await TestSubmission.findOneAndDelete({
      _id: submissionId,
      studentId: student._id,
      status: { $ne: 'corrected' } // Empêche la suppression si déjà corrigé
    });

    if (!submission) {
      return res.status(404).json({ 
        message: 'Soumission non trouvée, non autorisée ou déjà corrigée.' 
      });
    }

    res.status(200).json({ message: 'Soumission supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la soumission:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};