const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs').promises;
const authRoute = require('./Routes/AuthRoutes/AuthRoute');
const userRoutes = require('./Routes/AdminRoutes/UserRoutes');
const niveauRoute = require('./Routes/AdminRoutes/NiveauRoute');
const classeRoute = require('./Routes/AdminRoutes/ClasseRoute');
const eleveRoute = require('./Routes/AdminRoutes/EleveRoute');
const unitRoute = require('./Routes/AdminRoutes/UniteRoute');
const enseignantRoute = require('./Routes/AdminRoutes/EnseignantRoute');
const lessonRoute = require('./Routes/TeacherRoutes/LessonRoute');
const quizRoute = require('./Routes/TeacherRoutes/QuizRoute');
const gameRoute = require('./Routes/TeacherRoutes/GameRoute');
const TeacherprogramRoute = require('./Routes/TeacherRoutes/TeacherProgramRoute');
const AdminprogramRoute = require('./Routes/AdminRoutes/AdminProgramRoute');
const testRoute = require('./Routes/TeacherRoutes/TestRoute');
const vocabRoute = require('./Routes/TeacherRoutes/VocabRoute');
const categoryRoute = require('./Routes/TeacherRoutes/CategorieRoute');
const studentLessonRoutes = require('./Routes/StudentRoutes/StudentLessonRoute');
const studentVocabRoutes = require('./Routes/StudentRoutes/StudentVocabRoute');
const studentTestRoutes = require('./Routes/StudentRoutes/StudentTestRoute');
const studentQuizRoutes = require('./Routes/StudentRoutes/StudentQuizRoute');
const studentGameRoutes = require('./Routes/StudentRoutes/StudentGameRoute');
const notificationRoutes = require('./Routes/NotifRoutes/NotifRoute');
const parentProgressRoute = require('./Routes/ParentRoutes/ParentProgressRoute');
const messageRoutes = require('./Routes/MessageRoutes/MessageRoutes');


// Import model files to register schemas
require('./Models/TeacherModels/Quiz');
require('./Models/TeacherModels/Question');
require('./Models/TeacherModels/Reponse');
require('./Models/StudentModels/QuizSubmission');

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Increase request size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'Uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const validFileTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/opus',
    ];
    if (validFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seuls JPEG, PNG, PDF, MP3, WAV, OGG, WEBM, OPUS sont autorisés.'));
    }
  },
});

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(60000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('Multipart request detected. Body:', req.body, 'Files:', req.files);
  }
  next();
});

// Serve uploaded files with correct MIME types
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3')) {
      res.set('Content-Type', 'audio/mpeg');
    } else if (path.endsWith('.opus')) {
      res.set('Content-Type', 'audio/opus');
    } else if (path.endsWith('.wav')) {
      res.set('Content-Type', 'audio/wav');
    } else if (path.endsWith('.ogg')) {
      res.set('Content-Type', 'audio/ogg');
    } else if (path.endsWith('.webm')) {
      res.set('Content-Type', 'audio/webm');
    } else if (path.endsWith('.jpeg') || path.endsWith('.jpg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.pdf')) {
      res.set('Content-Type', 'application/pdf');
    }
  },
}));

// Media deletion endpoint
app.delete('/api/quizs/media/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'Uploads', req.params.filename);
    await fs.unlink(filePath);
    res.status(200).json({ message: 'Fichier supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du fichier:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression du fichier', error: err.message });
  }
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api', userRoutes);
app.use('/api', niveauRoute);
app.use('/api', classeRoute);
app.use('/api', eleveRoute);
app.use('/api', enseignantRoute);
app.use('/api', lessonRoute);
app.use('/api', TeacherprogramRoute);
app.use('/api', AdminprogramRoute);
app.use('/api/game', gameRoute);
app.use('/api/tests', testRoute);
app.use('/api', unitRoute);
app.use('/api', quizRoute);
app.use('/api/vocab', vocabRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/student', studentLessonRoutes);
app.use('/api/student', studentVocabRoutes);
app.use('/api/student', studentTestRoutes);
app.use('/api/student', studentQuizRoutes);
app.use('/api/student', studentGameRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parent', parentProgressRoute);
app.use('/api/messages',messageRoutes );


// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});