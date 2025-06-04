const mongoose = require('mongoose');
const Quiz = require('../../Models/TeacherModels/Quiz');
const Question = require('../../Models/TeacherModels/Question');
const Reponse = require('../../Models/TeacherModels/Reponse');
const QuizSubmission = require('../../Models/StudentModels/QuizSubmission');
const path = require('path');
const fs = require('fs').promises;


const handleFileUpload = async (file) => {
  if (!file) return null;
  return file.filename;
};

const deleteFile = async (filename) => {
  if (!filename) return;
  try {
    const filePath = path.join(__dirname, '../../Uploads', filename);
    await fs.unlink(filePath);
  } catch (err) {
    console.error(`Erreur lors de la suppression du fichier ${filename}:`, err);
  }
};

exports.createQuiz = async (req, res) => {
  try {
    const { titre, difficulty, questions } = req.body;
    const parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

    if (!titre || !difficulty || !parsedQuestions) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    // Create and save the Quiz first to get its _id
    const quiz = new Quiz({
      titre,
      difficulty,
      questions: [], // Will be updated later
      createdBy: req.user._id,
    });
    await quiz.save();

    const savedQuestions = await Promise.all(
      parsedQuestions.map(async (q, qIndex) => {
        const question = new Question({
          enonce: q.enonce,
          type: q.type,
          imageUrl: await handleFileUpload(req.files.find(f => f.fieldname === `question_image_${qIndex}`)),
          audioUrl: await handleFileUpload(req.files.find(f => f.fieldname === `question_audio_${qIndex}`)),
          quizId: quiz._id, // Assign the quiz's _id
        });

        // Save the question to get its _id
        await question.save();

        const savedResponses = await Promise.all(
          q.reponses.map(async (r, rIndex) => {
            const responseInstance = new Reponse({
              texte: r.texte,
              estCorrecte: r.estCorrecte,
              imageUrl: r.existingImage || await handleFileUpload(req.files.find(f => f.fieldname === `response_image_${qIndex}_${rIndex}`)),
              side: r.side,
              matchedResponseId: r.matchedResponseId,
              questionId: question._id, // Assign the question's _id
            });
            await responseInstance.save();
            return responseInstance._id;
          })
        );

        question.reponses = savedResponses;
        await question.save(); // Update question with response IDs
        return question._id;
      })
    );

    // Update the quiz with the saved question IDs
    quiz.questions = savedQuestions;
    await quiz.save();

    const populatedQuiz = await Quiz.findById(quiz._id)
      .populate({
        path: 'questions',
        populate: { path: 'reponses' },
      });

    res.status(201).json(populatedQuiz);
  } catch (error) {
    console.error('Erreur lors de la création du quiz:', error);
    // If quiz was created but an error occurred, clean up
    if (quiz && quiz._id) {
      await Quiz.deleteOne({ _id: quiz._id });
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .populate({
        path: 'questions',
        populate: { path: 'reponses' },
      });
    res.status(200).json(quizzes);
  } catch (error) {
    console.error('Erreur lors de la récupération des quiz:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate({
        path: 'questions',
        populate: { path: 'reponses' },
      });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.error('Erreur lors de la récupération du quiz:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { titre, difficulty, questions } = req.body;
    const parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

    if (!titre || !difficulty || !parsedQuestions) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    const filesToDelete = [];
    const existingQuestions = await Question.find({ _id: { $in: quiz.questions } });
    for (const q of existingQuestions) {
      if (q.imageUrl) filesToDelete.push(q.imageUrl);
      if (q.audioUrl) filesToDelete.push(q.audioUrl);
      const responses = await Reponse.find({ _id: { $in: q.reponses } });
      for (const r of responses) {
        if (r.imageUrl) filesToDelete.push(r.imageUrl);
      }
    }

    await Question.deleteMany({ _id: { $in: quiz.questions } });
    await Reponse.deleteMany({
      _id: { $in: (await Question.find({ _id: { $in: quiz.questions } })).flatMap(q => q.reponses) },
    });

    const savedQuestions = await Promise.all(
      parsedQuestions.map(async (q, qIndex) => {
        const question = new Question({
          enonce: q.enonce,
          type: q.type,
          imageUrl: q.existingImage || await handleFileUpload(req.files.find(f => f.fieldname === `question_image_${qIndex}`)),
          audioUrl: q.existingAudio || await handleFileUpload(req.files.find(f => f.fieldname === `question_audio_${qIndex}`)),
          quizId: quiz._id, // Assign the quiz's _id
        });

        await question.save(); // Save question to get _id

        const savedResponses = await Promise.all(
          q.reponses.map(async (r, rIndex) => {
            const responseInstance = new Reponse({
              texte: r.texte,
              estCorrecte: r.estCorrecte,
              imageUrl: r.existingImage || await handleFileUpload(req.files.find(f => f.fieldname === `response_image_${qIndex}_${rIndex}`)),
              side: r.side,
              matchedResponseId: r.matchedResponseId,
              questionId: question._id, // Assign the question's _id
            });
            await responseInstance.save();
            return responseInstance._id;
          })
        );

        question.reponses = savedResponses;
        await question.save(); // Update question with response IDs
        return question._id;
      })
    );

    quiz.titre = titre;
    quiz.difficulty = difficulty;
    quiz.questions = savedQuestions;
    await quiz.save();

    await Promise.all(filesToDelete.map(deleteFile));

    const populatedQuiz = await Quiz.findById(quiz._id)
      .populate({
        path: 'questions',
        populate: { path: 'reponses' },
      });

    res.status(200).json(populatedQuiz);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du quiz:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    const filesToDelete = [];
    const questions = await Question.find({ _id: { $in: quiz.questions } });
    for (const q of questions) {
      if (q.imageUrl) filesToDelete.push(q.imageUrl);
      if (q.audioUrl) filesToDelete.push(q.audioUrl);
      const responses = await Reponse.find({ _id: { $in: q.reponses } });
      for (const r of responses) {
        if (r.imageUrl) filesToDelete.push(r.imageUrl);
      }
    }

    await Quiz.deleteOne({ _id: req.params.id });
    await Question.deleteMany({ _id: { $in: quiz.questions } });
    await Reponse.deleteMany({
      _id: { $in: questions.flatMap(q => q.reponses) },
    });
    await QuizSubmission.deleteMany({ quizId: req.params.id });

    await Promise.all(filesToDelete.map(deleteFile));

    res.status(200).json({ message: 'Quiz supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du quiz:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, responses } = req.body;
    if (!quizId || !responses) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    const quiz = await Quiz.findById(quizId).populate({
      path: 'questions',
      populate: { path: 'reponses' },
    });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz non trouvé' });
    }

    const results = [];
    let score = 0;
    const total = quiz.questions.length;

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const response = responses.find(r => r.questionId.toString() === question._id.toString());
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
        const correctResponse = question.reponses.find(r => r.estCorrecte);
        isCorrect = response.selectedResponseIds.includes(correctResponse._id.toString());
        selectedAnswer = question.reponses.find(r => response.selectedResponseIds.includes(r._id.toString()))?.texte || 'Aucune';
      } else if (question.type === 'matching') {
        const correctPairs = [];
        for (let j = 0; j < question.reponses.length; j += 2) {
          const left = question.reponses[j];
          const right = question.reponses[j + 1];
          if (left.matchedResponseId === `right${j / 2 + 1}`) {
            correctPairs.push({ leftId: left._id, rightId: right._id });
          }
        }

        const submittedPairs = response.matchingPairs || [];
        isCorrect = submittedPairs.length === correctPairs.length &&
          submittedPairs.every(sp =>
            correctPairs.some(cp =>
              sp.leftId.toString() === cp.leftId.toString() &&
              sp.rightId.toString() === cp.rightId.toString()
            )
          );
        selectedAnswer = submittedPairs.map(sp => {
          const left = question.reponses.find(r => r._id.toString() === sp.leftId.toString());
          const right = question.reponses.find(r => r._id.toString() === sp.rightId.toString());
          return `${left?.texte || 'N/A'} → ${right?.texte || 'N/A'}`;
        }).join(', ');
      }

      if (isCorrect) score++;
      results.push({
        questionId: question._id,
        question: question.enonce,
        isCorrect,
        selectedAnswer,
      });
    }

    const percentage = (score / total) * 100;
    const nextLevel = percentage >= 80 ? getNextDifficulty(quiz.difficulty) : quiz.difficulty;

    const submission = new QuizSubmission({
      quizId,
      userId: req.user._id,
      studentId: req.user._id, // Set studentId to the authenticated user's ID
      responses,
      results,
      score,
      total,
      percentage,
      difficulty: quiz.difficulty, // Set difficulty from the quiz
    });
    await submission.save();

    res.status(200).json({
      score,
      total,
      percentage,
      results,
      nextLevel,
    });
  } catch (error) {
    console.error('Erreur lors de la soumission du quiz:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const getNextDifficulty = (current) => {
  if (current === 'facile') return 'moyen';
  if (current === 'moyen') return 'difficile';
  return 'difficile';
};