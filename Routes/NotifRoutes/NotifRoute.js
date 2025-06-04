const express = require('express');
const router = express.Router();
const protectRoute = require('../../MiddleWare/protectRoute');
const notifController = require('../../Controllers/SystemNotif/NotifController');

// Notification routes
router.get('/', protectRoute, notifController.getNotifications);
router.put('/:id/read', protectRoute, notifController.markAsRead);
router.delete('/:id', protectRoute, notifController.deleteNotification);
router.delete('/', protectRoute, notifController.deleteAllNotifications);
router.put('/read-all', protectRoute, notifController.markAllAsRead); // New route

module.exports = router;