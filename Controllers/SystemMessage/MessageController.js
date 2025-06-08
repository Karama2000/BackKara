const Message = require('../../Models/SystemeMessage/Message');
const User = require('../../Models/AdminModels/User');
const path = require('path');
const fs = require('fs');

// Helper function to generate conversation ID
const generateConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Send a message (text or file)
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user._id; // Assumes user is authenticated and user ID is in req.user

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const conversationId = generateConversationId(senderId, recipientId);
    const messageData = {
      sender: senderId,
      recipient: recipientId,
      conversationId,
      content: content || '',
      fileType: 'text',
    };

    // Handle file upload (image, audio, or document)
    if (req.file) {
      const allowedTypes = {
        image: ['image/jpeg', 'image/jpg', 'image/png'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
        file: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      };

      if (allowedTypes.image.includes(req.file.mimetype)) {
        messageData.fileType = 'image';
      } else if (allowedTypes.audio.includes(req.file.mimetype)) {
        messageData.fileType = 'audio';
      } else if (allowedTypes.file.includes(req.file.mimetype)) {
        messageData.fileType = 'file';
      } else {
        // Delete the uploaded file if type is not allowed
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      // Ensure file size is within limit (10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'File size exceeds 10MB limit' });
      }

      messageData.fileUrl = `/Uploads/${req.file.filename}`;
    }

    const message = new Message(messageData);
    await message.save();

    // Populate sender and recipient details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'prenom nom role imageUrl')
      .populate('recipient', 'prenom nom role imageUrl');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error while sending message' });
  }
};

// Get conversation between two users
exports.getConversation = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const senderId = req.user._id;

    const conversationId = generateConversationId(senderId, recipientId);
    const messages = await Message.find({ conversationId })
      .populate('sender', 'prenom nom role imageUrl')
      .populate('recipient', 'prenom nom role imageUrl')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Server error while fetching conversation' });
  }
};

// Mark a message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }

    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Server error while marking message as read' });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender or recipient can delete the message
    if (
      message.sender.toString() !== userId.toString() &&
      message.recipient.toString() !== userId.toString()
    ) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Delete file from server if it exists
    if (message.fileUrl) {
      const filePath = path.join(__dirname, '..', 'public', message.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Message.deleteOne({ _id: messageId });

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Server error while deleting message' });
  }
};

// Get unread senders
exports.getUnreadSenders = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate unread messages by sender
    const unreadSenders = await Message.aggregate([
      {
        $match: {
          recipient: userId,
          read: false,
        },
      },
      {
        $group: {
          _id: '$sender',
          unreadCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'sender',
        },
      },
      {
        $unwind: '$sender',
      },
      {
        $project: {
          _id: '$sender._id',
          prenom: '$sender.prenom',
          nom: '$sender.nom',
          role: '$sender.role',
          imageUrl: '$sender.imageUrl',
          unreadCount: 1,
        },
      },
    ]);

    res.status(200).json(unreadSenders);
  } catch (error) {
    console.error('Error fetching unread senders:', error);
    res.status(500).json({ error: 'Server error while fetching unread senders' });
  }
};

// Get teachers (for parent and student roles)
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'enseignant' }).select('prenom nom role imageUrl');
    res.status(200).json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Server error while fetching teachers' });
  }
};

// Get all users (for teacher role)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['parent', 'eleve'] } })
      .populate('niveau', 'nom')
      .populate('classe', 'nom')
      .select('prenom nom role imageUrl enfants niveau classe');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error while fetching users' });
  }
};