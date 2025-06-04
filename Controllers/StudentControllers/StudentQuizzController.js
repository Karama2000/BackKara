const mongoose = require('mongoose');
const Quiz = mongoose.model('Quiz');
const QuizSubmission = mongoose.model('QuizSubmission');
const Parent = require('../../Models/AdminModels/Parent');
const Notification = require('../../Models/SystemeNotif/Notification');

const getNextDifficulty = (current) => {
  const levels = ['facile', 'moyen', 'difficile'];
  const nextIndex = levels.indexOf(current) + 1;
  return levels[Math.min(nextIndex, levels.length - 1)];
};

// Controllers/StudentControllers/StudentQuizzController.js
exports.getStudentQuizzes = async (req, res) => {
  try {
    const student = req.user;
    console.log('Fetching quizzes for student:', student._id);
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const [quizzes, submissions] = await Promise.all([
      Quiz.find()
        .populate({
          path: 'questions',
          populate: { path: 'reponses' },
        })
        .lean(),
      QuizSubmission.find({ studentId: student._id })
        .populate('quizId', 'titre difficulty')
        .lean(),
    ]);
    console.log('Quizzes found:', quizzes.length);
    console.log('Submissions found:', submissions.length);

    const unlockedLevels = { facile: true, moyen: false, difficile: false };
    for (const submission of submissions) {
      if (submission.percentage >= 80 && submission.quizId) {
        const quiz = quizzes.find((q) => q._id.toString() === submission.quizId._id.toString());
        if (quiz) {
          if (quiz.difficulty === 'facile') unlockedLevels.moyen = true;
          if (quiz.difficulty === 'moyen') unlockedLevels.difficile = true;
        }
      }
    }
    console.log('Unlocked levels:', unlockedLevels);

    const categorizedQuizzes = {
      facile: quizzes
        .filter((q) => q.difficulty === 'facile')
        .map((q) => ({
          ...q,
          submissions: submissions.filter((s) => s.quizId && s.quizId._id.toString() === q._id.toString()),
        })),
      moyen: unlockedLevels.moyen
        ? quizzes
            .filter((q) => q.difficulty === 'moyen')
            .map((q) => ({
              ...q,
              submissions: submissions.filter((s) => s.quizId && s.quizId._id.toString() === q._id.toString()),
            }))
        : [],
      difficile: unlockedLevels.difficile
        ? quizzes
            .filter((q) => q.difficulty === 'difficile')
            .map((q) => ({
              ...q,
              submissions: submissions.filter((s) => s.quizId && s.quizId._id.toString() === q._id.toString()),
            }))
        : [],
    };

    res.status(200).json({ quizzes: categorizedQuizzes, unlockedLevels });
  } catch (error) {
    console.error('Error in getStudentQuizzes:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};
// Controllers/StudentControllers/StudentQuizzController.js
exports.getLinkedParents = async (req, res) => {
  try {
    const student = req.user;
    if (student.__t !== 'Eleve') {
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    const parents = await Parent.find({ enfants: student._id }).select('prenom nom _id');
    res.status(200).json({ parents });
  } catch (error) {
    console.error('Error in getLinkedParents:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const student = req.user;
    console.log('Authenticated student:', {
      id: student._id.toString(),
      prenom: student.prenom || 'N/A',
      nom: student.nom || 'N/A',
      type: student.__t,
    });

    if (student.__t !== 'Eleve') {
      console.error('Unauthorized access: User is not a student');
      return res.status(403).json({ message: 'Accès réservé aux élèves.' });
    }

    if (!student.prenom || !student.nom) {
      console.error('Student missing prenom or nom:', student._id.toString());
      return res.status(400).json({ message: 'Les informations de l\'élève sont incomplètes (prenom ou nom manquant).' });
    }

    const { quizId, responses } = req.body;
    if (!mongoose.Types.ObjectId.isValid(quizId) || !Array.isArray(responses)) {
      console.error('Invalid input:', { quizId, responses });
      return res.status(400).json({ message: 'Données invalides.' });
    }

    const quiz = await Quiz.findById(quizId).populate({
      path: 'questions',
      populate: { path: 'reponses' },
    });
    if (!quiz) {
      console.error('Quiz not found:', quizId);
      return res.status(404).json({ message: 'Quiz non trouvé.' });
    }
    console.log('Quiz found:', { id: quiz._id.toString(), titre: quiz.titre });

    const results = [];
    let score = 0;
    const total = quiz.questions.length;

    for (const question of quiz.questions) {
      const response = responses.find((r) => r.questionId.toString() === question._id.toString());
      if (!response) {
        results.push({
          questionId: question._id,
          question: question.enonce,
          isCorrect: false,
          selectedAnswer: 'Aucune réponse fournie',
        });
        continue;
      }

      let isCorrect = false;
      let selectedAnswer = '';

      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        const correctResponse = question.reponses.find((r) => r.estCorrecte);
        if (!correctResponse) {
          results.push({
            questionId: question._id,
            question: question.enonce,
            isCorrect: false,
            selectedAnswer: 'Aucune réponse correcte définie',
          });
          continue;
        }
        isCorrect = response.selectedResponseIds?.includes(correctResponse._id.toString());
        selectedAnswer =
          question.reponses.find((r) => response.selectedResponseIds?.includes(r._id.toString()))?.texte ||
          'Aucune';
      } else if (question.type === 'matching') {
        const correctPairs = [];
        for (let j = 0; j < question.reponses.length; j += 2) {
          const left = question.reponses[j];
          const right = question.reponses[j + 1];
          if (left && right) {
            correctPairs.push({ leftId: left._id.toString(), rightId: right._id.toString() });
          }
        }

        const submittedPairs = response.matchingPairs || [];
        isCorrect =
          submittedPairs.length === correctPairs.length &&
          submittedPairs.every((sp) =>
            correctPairs.some(
              (cp) => sp.leftId.toString() === cp.leftId && sp.rightId.toString() === cp.rightId
            )
          );
        selectedAnswer = submittedPairs
          .map((sp) => {
            const left = question.reponses.find((r) => r._id.toString() === sp.leftId.toString());
            const right = question.reponses.find((r) => r._id.toString() === sp.rightId.toString());
            return `${left?.texte || 'N/A'} -> ${right?.texte || 'N/A'}`;
          })
          .join(', ');
      }

      if (isCorrect) score++;
      results.push({
        questionId: question._id,
        question: question.enonce,
        isCorrect,
        selectedAnswer,
      });
    }

    const percentage = total > 0 ? (score / total) * 100 : 0;
    const nextLevel = percentage >= 80 ? getNextDifficulty(quiz.difficulty) : quiz.difficulty;

    const submission = new QuizSubmission({
      quizId,
      studentId: student._id,
      responses,
      results,
      score,
      total,
      percentage,
      submittedAt: new Date(),
    });
    await submission.save();
    console.log('Submission saved:', { id: submission._id.toString() });

    const parents = await Parent.find({ enfants: student._id }).select('prenom nom _id');
    console.log('Parent query executed:', { studentId: student._id.toString(), parentsFound: parents.length });

    if (!parents || parents.length === 0) {
      console.warn(`No parents linked to student ${student._id.toString()}. Verify 'enfants' field in Parent model.`);
      return res.status(200).json({
        score,
        total,
        percentage,
        results,
        nextLevel,
        warning: 'Aucun parent associé à cet élève. Notification non envoyée.',
      });
    }

    const notificationPromises = parents.map(async (parent) => {
      try {
        const notification = new Notification({
          userId: parent._id,
          type: 'quiz_submitted',
          message: `Votre enfant ${student.prenom} ${student.nom} a soumis le quiz "${quiz.titre}" avec un score de ${percentage.toFixed(2)}%.`,
          relatedId: submission._id,
          relatedModel: 'QuizSubmission',
          read: false,
          createdAt: new Date(),
        });
        await notification.save();
        console.log('Notification saved:', {
          id: notification._id.toString(),
          parentId: parent._id.toString(),
        });
        return notification._id.toString();
      } catch (err) {
        console.error(`Failed to save notification for parent ${parent._id.toString()}:`, err.message);
        throw new Error(`Échec de l'enregistrement de la notification pour le parent ${parent._id.toString()}: ${err.message}`);
      }
    });

    const notificationsCreated = await Promise.allSettled(notificationPromises).then((results) => {
      const successes = [];
      const errors = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successes.push(result.value);
        } else {
          errors.push(result.reason.message);
        }
      });
      return { successes, errors };
    });

    if (notificationsCreated.errors.length > 0) {
      console.warn('Some notifications failed to save:', notificationsCreated.errors);
      return res.status(200).json({
        score,
        total,
        percentage,
        results,
        nextLevel,
        warning: `Quiz soumis avec succès, mais certaines notifications ont échoué : ${notificationsCreated.errors.join(', ')}`,
      });
    }

    console.log('Quiz submission completed:', {
      submissionId: submission._id,
      notificationsCreated: notificationsCreated.successes.length,
    });
    return res.status(200, {
      success: true,
      score,
      total,
      percentage,
      results,
      nextLevel,
      notificationsCreated: notificationsCreated.successes.length,
    });
  } catch (error) {
    console.error('Error in submitQuiz:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};