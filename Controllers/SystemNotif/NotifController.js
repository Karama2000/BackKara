const Notification = require('../../Models/SystemeNotif/Notification');
const mongoose = require('mongoose');
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ userId: req.user._id });

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in getNotifications:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};
// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée.' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a single notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée.' });
    }
    res.json({ message: 'Notification supprimée.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all notifications for the user
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: 'Toutes les notifications ont été supprimées.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Mark all notifications as read for the user
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Aucune notification non lue trouvée.' });
    }
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (error) {
    console.error('Error in markAllAsRead:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};