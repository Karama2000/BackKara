const Test = require('../../Models/TeacherModels/Test');
const TestSubmission = require('../../Models/StudentModels/TestSubmission');
const Notification = require('../../Models/SystemeNotif/Notification');
const mongoose = require('mongoose');
const Lesson = require('../../Models/TeacherModels/Lesson');
const Progress = require('../../Models/StudentModels/Progress');

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
    res.status(200).json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ message: 'Error fetching tests.', error: error.message });
  }
};

exports.createTest = async (req, res) => {
  try {
    const { lessonId, programId, unitId, title, content } = req.body;
    const mediaFile = req.file ? req.file.filename : null;

    if (!lessonId || !programId || !unitId || !title) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId) || !mongoose.Types.ObjectId.isValid(programId) || !mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ message: 'Invalid Lesson ID, Program ID, or Unit ID.' });
    }

    const lesson = await Lesson.findOne({ _id: lessonId, teacherId: req.user._id });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found or unauthorized.' });
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

    // Notify students in the program’s niveau
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

    // Notify the teacher
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
    console.error('Error creating test:', error);
    res.status(500).json({ message: 'Error creating test.', error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { lessonId, programId, unitId, title, content } = req.body;
    const mediaFile = req.file ? req.file.filename : req.body.mediaFile;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Test ID.' });
    }

    const test = await Test.findOne({ _id: id, teacherId: req.user._id });
    if (!test) {
      return res.status(404).json({ message: 'Test not found or unauthorized.' });
    }

    if (lessonId) {
      if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        return res.status(400).json({ message: 'Invalid Lesson ID.' });
      }
      const lesson = await Lesson.findOne({ _id: lessonId, teacherId: req.user._id });
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found or unauthorized.' });
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

    res.status(200).json(populatedTest);
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ message: 'Error updating test.', error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Test ID.' });
    }

    const test = await Test.findOneAndDelete({ _id: id, teacherId: req.user._id });
    if (!test) {
      return res.status(404).json({ message: 'Test not found or unauthorized.' });
    }

    // Optionally, delete associated submissions
    await TestSubmission.deleteMany({ testId: id });

    res.status(200).json({ message: 'Test deleted successfully.' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ message: 'Error deleting test.', error: error.message });
  }
};

exports.getTestSubmissions = async (req, res) => {
  try {
    const { testId } = req.query;
    const query = {};
    if (testId) {
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        return res.status(400).json({ message: 'Invalid Test ID.' });
      }
      query.testId = testId;
      const test = await Test.findOne({ _id: testId, teacherId: req.user._id });
      if (!test) {
        return res.status(404).json({ message: 'Test not found or unauthorized.' });
      }
    } else {
      const teacherTests = await Test.find({ teacherId: req.user._id }).select('_id');
      query.testId = { $in: teacherTests.map(t => t._id) };
    }

    const submissions = await TestSubmission.find(query)
      .populate('testId', 'title')
      .populate('studentId', 'username')
      .lean();

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching test submissions:', error);
    res.status(500).json({ message: 'Error fetching submissions.', error: error.message });
  }
};

exports.provideFeedback = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback, status } = req.body;
    const correctionFile = req.file ? req.file.filename : null;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: 'Invalid Submission ID.' });
    }

    const submission = await TestSubmission.findById(submissionId).populate({
      path: 'testId',
      match: { teacherId: req.user._id },
    });

    if (!submission || !submission.testId) {
      return res.status(404).json({ message: 'Submission not found or unauthorized.' });
    }

    if (feedback) submission.feedback = feedback;
    if (status) submission.status = status;
    if (correctionFile) submission.correctionFile = correctionFile;
    if (status === 'corrigé') {
      submission.correctedAt = new Date();
    }

    await submission.save();

    if (status === 'corrigé') {
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
      .populate('testId', 'title')
      .populate('studentId', 'username prenom nom')
      .lean();

    res.status(200).json(populatedSubmission);
  } catch (error) {
    console.error('Error providing feedback:', error);
    res.status(500).json({ message: 'Error providing feedback.', error: error.message });
  }
};
exports.getStudentProgress = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get all tests created by the teacher
    const tests = await Test.find({ teacherId })
      .populate('lessonId', 'title')
      .populate('programId', 'title niveauId')
      .lean();

    // Get all submissions for these tests
    const testIds = tests.map((test) => test._id);
    const submissions = await TestSubmission.find({ testId: { $in: testIds } })
      .populate('studentId', 'username prenom nom niveau classe')
      .populate('testId', 'title')
      .lean();

    // Get lessons created by the teacher
    const lessons = await Lesson.find({ teacherId })
      .populate('programId', 'title niveauId')
      .lean();

    // Get progress for these lessons
    const lessonIds = lessons.map((lesson) => lesson._id);
    const progress = await Progress.find({ lessonId: { $in: lessonIds } })
      .populate('studentId', 'username prenom nom niveau classe')
      .populate('lessonId', 'title')
      .lean();

    // Get all students
    const students = await mongoose.model('User').find({ __t: 'Eleve' })
      .select('username prenom nom niveau classe')
      .lean();

    // Aggregate data by student
    const studentProgress = students.map((student) => {
      const studentSubmissions = submissions.filter(
        (sub) => sub.studentId._id.toString() === student._id.toString()
      );
      const studentProgress = progress.filter(
        (prog) => prog.studentId._id.toString() === student._id.toString()
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
          feedback: sub.feedback,
          correctionFile: sub.correctionFile,
        })),
        lessons: studentProgress.map((prog) => ({
          lessonId: prog.lessonId._id,
          lessonTitle: prog.lessonId.title,
          status: prog.status,
          notes: prog.notes,
          completionDate: prog.completionDate,
        })),
      };
    });

    res.status(200).json(studentProgress);
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des progrès des élèves.' });
  }
};
