const express = require('express');
const router = express.Router();
const parentProgressController = require('../../Controllers/ParentControllers/ParentProgressController');
const parentController = require('../../Controllers/ParentControllers/ParentController');
const authMiddleware = require('../../MiddleWare/protectRoute');

router.get('/parent/children', authMiddleware, parentController.getChildren);
router.get('/parent/progress', authMiddleware, parentController.getChildrenProgress);
router.delete('/parent/progress', authMiddleware, parentController.deleteChildrenProgress);
router.get('/parent/notifications', authMiddleware, parentController.getParentNotifications);
router.post('/parent/notifications/:id/read', authMiddleware, parentController.markNotificationAsRead);
router.delete('/parent/notifications/:id', authMiddleware, parentController.deleteParentNotification);
router.delete('/parent/notifications', authMiddleware, parentController.deleteAllParentNotifications);

module.exports = router;
module.exports = router;
