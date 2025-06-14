const mongoose = require('mongoose');
const Test = require('../../Models/TeacherModels/Test');
const TestSubmission = require('../../Models/StudentModels/TestSubmission');
const Notification = require('../../Models/SystemeNotif/Notification');
const Lesson = require('../../Models/TeacherModels/Lesson');

// Base URL pour les fichiers
const BASE_URL = 'http://localhost:5000/Uploads/';

exports.getAllTests = async (req, res) => {
  try {
    const { lessonId } = req.query;
    const query = { teacherId: req.user._id };
    if (lessonId && mongoose.Types.ObjectId.isValid(lessonId)) {
      query.lessonId = lessonId;
    }
    const tests = await Test.find(query)
      .populate('lessonId', 'title')
      .populate('programId', 'title niveauId')
      .populate('unitId', 'title')
      .lean();
    // Ajouter l'URL absolue pour mediaFile
    const testsWithUrls = tests.map(test => ({
      ...test,
      mediaFile: test.mediaFile ? `${BASE_URL}${test.mediaFile}` : null,
    }));
    res.status(200).json(testsWithUrls);
  } catch (error) {
    console.error('Erreur lors de la récupération des tests:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des tests.', error: error.message });
  }
};

exports.createTest = async (req, res) => {
  try {
    const { lessonId, programId, unitId, title, content } = req.body;
    const mediaFile = req.file ? req.file.filename : null;

    if (!lessonId || !programId || !unitId || !title) {
      return res.status(400).json({ message: 'Champs obligatoires manquants.' });
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId) || !mongoose.Types.ObjectId.isValid(programId) || !mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ message: 'ID de leçon, programme ou unité invalide.' });
    }

    const lesson = await Lesson.findOne({ _id: lessonId, teacherId: req.user._id });
    if (!lesson) {
      return res.status(404).json({ message: 'Leçon non trouvée ou non autorisée.' });
    }

    const test = new Test({
      lessonId,
      programId,
      unitId,
      title,
      content,
      mediaFile,
      teacherId: req.user._id,
    });

    await test.save();
    const populatedTest = await Test.findById(test._id)
      .populate('lessonId', 'title')
      .populate('programId', 'title niveauId')
      .populate('unitId', 'title')
      .lean();

    // Ajouter l'URL absolue pour mediaFile
    populatedTest.mediaFile = populatedTest.mediaFile ? `${BASE_URL}${populatedTest.mediaFile}` : null;

    // Notifier les élèves du niveau
    const program = await mongoose.model('Program').findById(programId);
    const students = await mongoose.model('User').find({
      __t: 'Eleve',
      niveau: program.niveauId,
    });

    const notifications = students.map((student) => ({
      userId: student._id,
      type: 'test_added',
      message: `Nouveau test ajouté : ${title}`,
      relatedId: test._id,
      relatedModel: 'Test',
    }));

    await Notification.insertMany(notifications);

    // Notifier l'enseignant
    const teacherNotification = new Notification({
      userId: req.user._id,
      type: 'test_added',
      message: `Vous avez ajouté le test : ${title}`,
      relatedId: test._id,
      relatedModel: 'Test',
    });
    await teacherNotification.save();

    res.status(201).json(populatedTest);
  } catch (error) {
    console.error('Erreur lors de la création du test:', error);
    res.status(500).json({ message: 'Erreur lors de la création du test.', error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { lessonId, programId, unitId, title, content } = req.body;
    const mediaFile = req.file ? req.file.filename : req.body.mediaFile;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de test invalide.' });
    }

    const test = await Test.findOne({ _id: id, teacherId: req.user._id });
    if (!test) {
      return res.status(404).json({ message: 'Test non trouvé ou non autorisé.' });
    }

    if (lessonId) {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: 'ID de leçon invalide.' });
      }
      const lesson = await Lesson.findOne({ _id: lessonId, teacherId: req.user._id });
      if (!lesson) {
        return res.status(404).json({ message: 'Leçon non trouvée ou non autorisée.' });
      }
      test.lessonId = lessonId;
    }

    if (programId) test.programId = programId;
    if (unitId) test.unitId = unitId;
    if (title) test.title = title;
    if (content !== undefined) test.content = content;
    if (mediaFile) test.mediaFile = mediaFile;

    await test.save();
    const populatedTest = await Test.findById(test._id)
      .populate('lessonId', 'title')
      .populate('programId', 'title niveauId')
      .populate('unitId', 'title')
      .lean();

    // Ajouter l'URL absolue pour mediaFile
    populatedTest.mediaFile = populatedTest.mediaFile ? `${BASE_URL}${populatedTest.mediaFile}` : null;

    res.status(200).json(populatedTest);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du test:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du test.', error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de test invalide.' });
    }

    const test = await Test.findOneAndDelete({ _id: id, teacherId: req.user._id });
    if (!test) {
      return res.status(404).json({ message: 'Test non trouvé ou non autorisé.' });
    }

    await TestSubmission.deleteMany({ testId: id });

    res.status(200).json({ message: 'Test supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du test:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du test.', error: error.message });
  }
};

exports.getTestSubmissions = async (req, res) => {
  try {
    const { testId } = req.query;
    const query = {};
    if (testId) {
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        return res.status(400).json({ message: 'ID de test invalide.' });
      }
      query.testId = testId;
      const test = await Test.findOne({ _id: testId, teacherId: req.user._id });
      if (!test) {
        return res.status(404).json({ message: 'Test non trouvé ou non autorisé.' });
      }
    } else {
      const teacherTests = await Test.find({ teacherId: req.user._id }).select('_id');
      query.testId = { $in: teacherTests.map(t => t._id) };
    }

    const submissions = await TestSubmission.find(query)
      .select('testId anonymousId submittedFile status feedback correctionFile submittedAt correctedAt')
      .populate('testId', 'title')
      .lean();

    // Ajouter les URLs absolues pour submittedFile et correctionFile
    const submissionsWithUrls = submissions.map(sub => ({
      ...sub,
      submittedFile: sub.submittedFile ? `${BASE_URL}${sub.submittedFile}` : null,
      correctionFile: sub.correctionFile ? `${BASE_URL}${sub.correctionFile}` : null,
    }));

    res.status(200).json(submissionsWithUrls);
  } catch (error) {
    console.error('Erreur lors de la récupération des soumissions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des soumissions.', error: error.message });
  }
};

exports.provideFeedback = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback, status } = req.body;
    const correctionFile = req.file ? req.file.filename : null;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: 'ID de soumission invalide.' });
    }

    const submission = await TestSubmission.findById(submissionId).populate({
      path: 'testId',
      match: { teacherId: req.user._id },
    });

    if (!submission || !submission.testId) {
      return res.status(404).json({ message: 'Soumission non trouvée ou non autorisée.' });
    }

    if (feedback) submission.feedback = feedback;
    if (status) submission.status = status;
    if (correctionFile) submission.correctionFile = correctionFile;
    if (status === 'corrected') {
      submission.correctedAt = new Date();
    }

    await submission.save();

    if (status === 'corrected') {
      const notification = new Notification({
        userId: submission.studentId,
        type: 'test_corrected',
        message: `Votre soumission pour le test "${submission.testId.title}" a été corrigée.`,
        relatedId: submission._id,
        relatedModel: 'TestSubmission',
      });
      await notification.save();
    }

    const populatedSubmission = await TestSubmission.findById(submission._id)
      .select('testId anonymousId submittedFile status feedback correctionFile submittedAt correctedAt')
      .populate('testId', 'title')
      .lean();

    // Ajouter les URLs absolues
    populatedSubmission.submittedFile = populatedSubmission.submittedFile ? `${BASE_URL}${populatedSubmission.submittedFile}` : null;
    populatedSubmission.correctionFile = populatedSubmission.correctionFile ? `${BASE_URL}${populatedSubmission.correctionFile}` : null;

    res.status(200).json(populatedSubmission);
  } catch (error) {
    console.error('Erreur lors de la soumission du feedback:', error);
    res.status(500).json({ message: 'Erreur lors de la soumission du feedback.', error: error.message });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback, status } = req.body;
    const correctionFile = req.file ? req.file.filename : null;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: 'ID de soumission invalide.' });
    }

    const submission = await TestSubmission.findById(submissionId).populate({
      path: 'testId',
      match: { teacherId: req.user._id },
    });

    if (!submission || !submission.testId) {
      return res.status(404).json({ message: 'Soumission non trouvée ou non autorisée.' });
    }

    if (feedback) submission.feedback = feedback;
    if (status) submission.status = status;
    if (correctionFile) submission.correctionFile = correctionFile;
    if (status === 'corrected') {
      submission.correctedAt = new Date();
    }

    await submission.save();

    const populatedSubmission = await TestSubmission.findById(submission._id)
      .select('testId anonymousId submittedFile status feedback correctionFile submittedAt correctedAt')
      .populate('testId', 'title')
      .lean();

    // Ajouter les URLs absolues
    populatedSubmission.submittedFile = populatedSubmission.submittedFile ? `${BASE_URL}${populatedSubmission.submittedFile}` : null;
    populatedSubmission.correctionFile = populatedSubmission.correctionFile ? `${BASE_URL}${populatedSubmission.correctionFile}` : null;

    res.status(200).json(populatedSubmission);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du feedback:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du feedback.', error: error.message });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: 'ID de soumission invalide.' });
    }

    const submission = await TestSubmission.findById(submissionId).populate({
      path: 'testId',
      match: { teacherId: req.user._id },
    });

    if (!submission || !submission.testId) {
      return res.status(404).json({ message: 'Soumission non trouvée ou non autorisée.' });
    }

    submission.feedback = null;
    submission.correctionFile = null;
    submission.status = 'submitted';
    submission.correctedAt = null;

    await submission.save();

    const populatedSubmission = await TestSubmission.findById(submission._id)
      .select('testId anonymousId submittedFile status feedback correctionFile submittedAt correctedAt')
      .populate('testId', 'title')
      .lean();

    // Ajouter les URLs absolues
    populatedSubmission.submittedFile = populatedSubmission.submittedFile ? `${BASE_URL}${populatedSubmission.submittedFile}` : null;
    populatedSubmission.correctionFile = populatedSubmission.correctionFile ? `${BASE_URL}${populatedSubmission.correctionFile}` : null;

    res.status(200).json({ message: 'Feedback supprimé avec succès.', submission: populatedSubmission });
  } catch (error) {
    console.error('Erreur lors de la suppression du feedback:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du feedback.', error: error.message });
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const tests = await Test.find({ teacherId })
      .populate('lessonId', 'title')
      .populate('programId', 'title niveauId')
      .lean();

    const testIds = tests.map((test) => test._id);

    const submissions = await TestSubmission.find({ testId: { $in: testIds } })
      .select('testId studentId anonymousId submittedFile status feedback correctionFile submittedAt correctedAt')
      .populate('testId', 'title')
      .lean();

    const lessons = await Lesson.find({ teacherId })
      .populate('programId', 'title niveauId')
      .lean();

    const lessonIds = lessons.map((lesson) => lesson._id);

    const progress = await mongoose.model('Progress').find({ lessonId: { $in: lessonIds } })
      .populate('studentId', 'username prenom nom niveau classe')
      .populate('lessonId', 'title')
      .lean();

    const students = await mongoose.model('User').find({ __t: 'Eleve' })
      .select('username prenom nom niveau classe')
      .lean();

    const studentProgress = students.map((student) => {
      const studentSubmissions = submissions.filter(
        (sub) => sub.studentId && sub.studentId.toString() === student._id.toString()
      );
      const studentProgress = progress.filter(
        (prog) => prog.studentId && prog.studentId._id.toString() === student._id.toString()
      );

      return {
        student: {
          id: student._id,
          prenom: student.prenom,
          nom: student.nom,
          niveau: student.niveau,
          classe: student.classe,
        },
        tests: studentSubmissions.map((sub) => ({
          testId: sub.testId._id,
          testTitle: sub.testId.title,
          status: sub.status,
          submittedAt: sub.submittedAt,
          feedback: sub.feedback || null,
          correctionFile: sub.correctionFile ? `${BASE_URL}${sub.correctionFile}` : null,
        })),
        lessons: studentProgress.map((prog) => ({
          lessonId: prog.lessonId._id,
          lessonTitle: prog.lessonId.title,
          status: prog.status,
          currentPage: prog.currentPage || 1,
          notes: prog.notes || null,
          completionDate: prog.completionDate || null,
        })),
      };
    });

    const filteredStudentProgress = studentProgress.filter(
      (sp) => sp.tests.length > 0 || sp.lessons.length > 0
    );

    res.status(200).json(filteredStudentProgress);
  } catch (error) {
    console.error('Erreur lors de la récupération des progrès des élèves:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des progrès des élèves.', error: error.message });
  }
};