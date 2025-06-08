const express = require('express');
const router = express.Router();
const messageController = require('../../Controllers/SystemMessage/MessageController');
const auth = require('../../MiddleWare/protectRoute');
const handleUpload = require('../../MiddleWare/upload');

router.post('/', auth, handleUpload, messageController.sendMessage);
router.get('/conversation/:userId', auth, messageController.getConversation);
router.get('/received', auth, messageController.getReceivedMessages);
router.get('/sent', auth, messageController.getSentMessages);
router.get('/unread-count', auth, messageController.getUnreadMessagesCount);
router.put('/:id/read', auth, messageController.markMessageAsRead);
router.delete('/:id', auth, messageController.deleteMessage);
router.delete('/received', auth, messageController.deleteAllReceivedMessages);
router.get('/unread-senders', auth, messageController.getUnreadMessageSenders);
router.get('/teachers', auth, messageController.getTeachers);

module.exports = router;