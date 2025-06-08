const express = require('express');
const router = express.Router();
const MessagesController = require('../../Controllers/SystemMessage/MessageController');
const authMiddleware = require('../../MiddleWare/protectRoute'); // Assumes you have an auth middleware
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/Uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  },
});

// Routes
router.post('/', authMiddleware, upload.single('file'), MessagesController.sendMessage);
router.get('/conversation/:recipientId', authMiddleware, MessagesController.getConversation);
router.put('/:messageId/read', authMiddleware, MessagesController.markAsRead);
router.delete('/:messageId', authMiddleware, MessagesController.deleteMessage);
router.get('/unread-senders', authMiddleware, MessagesController.getUnreadSenders);
router.get('/teachers', authMiddleware, MessagesController.getTeachers);
router.get('/users', authMiddleware, MessagesController.getUsers);

module.exports = router;