const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../Uploads'); // Respecte la casse 'Uploads'
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `screenshot-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const validFileTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (validFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, PNG et WEBP sont autorisés'), false);
    }
  },
}).single('screenshot');

const handleScreenshotUpload = (req, res, next) => {
  console.log('handleScreenshotUpload - Incoming request headers:', req.headers);
  console.log('handleScreenshotUpload - Incoming request body:', req.body);
  upload(req, res, (err) => {
    console.log('handleScreenshotUpload - req.file:', req.file);
    console.log('handleScreenshotUpload - req.body after multer:', req.body);
    if (err instanceof multer.MulterError) {
      return res.status(413).json({ error: `Erreur de téléchargement: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune capture d\'écran n\'a été téléversée' });
    }
    // Stocker le chemin relatif avec 'Uploads' (casse respectée)
    req.file.relativePath = `/Uploads/${req.file.filename}`;
    next();
  });
};

module.exports = handleScreenshotUpload;