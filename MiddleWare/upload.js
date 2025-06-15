const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../Uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': '.jpeg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/webm': '.webm',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Type de fichier non supporté. Seuls JPEG, PNG, WEBP, PDF, MP3, WAV, OGG, WEBM, DOC, DOCX sont autorisés.'
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'mediaFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'imageUrl', maxCount: 1 },
]);

const handleUpload = (req, res, next) => {
  console.log('Requête multipart reçue:', {
    headers: req.headers,
    method: req.method,
    url: req.url,
  });
  upload(req, res, (err) => {
    console.log('Résultat du parsing Multer:', {
      files: req.files,
      body: req.body,
      error: err ? err.message : null,
    });
    if (err) {
      console.error('Erreur Multer:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Fichier trop volumineux (max 10MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = handleUpload;