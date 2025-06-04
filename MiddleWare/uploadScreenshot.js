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
    cb(null, `screenshot-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
    next();
  });
};

module.exports = handleScreenshotUpload;