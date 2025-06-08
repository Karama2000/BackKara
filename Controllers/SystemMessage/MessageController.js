const Message = require('../../Models/SystemeMessage/Message');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../../Models/AdminModels/User'); 
const generateConversationId = (userId1, userId2) => {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'Destinataire requis.' });
    }

    if (!content && !req.files) {
      return res.status(400).json({ message: 'Le contenu ou un fichier est requis.' });
    }

    const conversationId = generateConversationId(req.user.id, recipientId);
    const messages = [];

    // Handle text message
    if (content) {
      const textMessage = new Message({
        sender: req.user.id,
        recipient: recipientId,
        conversationId,
        content,
        fileType: 'text',
      });
      await textMessage.save();
      messages.push(textMessage);
    }

    // Handle uploaded files
    if (req.files) {
      const validImageExt = ['.jpeg', '.jpg', '.png'];
      const validAudioExt = ['.mp3', '.wav', '.ogg', '.webm'];
      const validFileExt = ['.pdf', '.doc', '.docx'];

      for (const field of ['image', 'audio', 'file']) {
        if (req.files[field]) {
          const file = req.files[field][0];
          const fileUrl = `/Uploads/${file.filename}`;
          const ext = path.extname(file.filename).toLowerCase();
          let fileType;

          if (validImageExt.includes(ext)) {
            fileType = 'image';
          } else if (validAudioExt.includes(ext)) {
            fileType = 'audio';
          } else if (validFileExt.includes(ext)) {
            fileType = 'file';
          } else {
            return res.status(400).json({ message: 'Type de fichier non supporté.' });
          }

          const fileMessage = new Message({
            sender: req.user.id,
            recipient: recipientId,
            conversationId,
            fileUrl,
            fileType,
          });
          await fileMessage.save();
          messages.push(fileMessage);
        }
      }
    }

    res.status(201).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'envoi du message.', error: error.message });
  }
};

exports.getUnreadMessageSenders = async (req, res) => {
  try {
    const messages = await Message.aggregate([
      {
        $match: {
          recipient: new mongoose.Types.ObjectId(req.user.id),
          read: false,
        },
      },
      {
        $group: {
          _id: '$sender',
          unreadCount: { $sum: 1 },
          latestMessage: { $max: '$createdAt' },
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
          latestMessage: 1,
        },
      },
      {
        $sort: { latestMessage: -1 },
      },
    ]);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des expéditeurs de messages non lus.', error: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversationId = generateConversationId(req.user.id, userId);
    const messages = await Message.find({ conversationId })
      .populate('sender', 'prenom nom role')
      .populate('recipient', 'prenom nom role')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la conversation.', error: error.message });
  }
};

exports.getReceivedMessages = async (req, res) => {
  try {
    const messages = await Message.find({ recipient: req.user.id })
      .populate('sender', 'prenom nom role')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des messages.', error: error.message });
  }
};

exports.getSentMessages = async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.user.id })
      .populate('recipient', 'prenom nom role')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des messages envoyés.', error: error.message });
  }
};

exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du comptage des messages non lus.', error: error.message });
  }
};

exports.markMessageAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé.' });
    }
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé.' });
    }
    message.read = true;
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du message.', error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé.' });
    }
    if (message.recipient.toString() !== req.user.id && message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé.' });
    }
    await message.deleteOne();
    res.json({ message: 'Message supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du message.', error: error.message });
  }
};

exports.deleteAllReceivedMessages = async (req, res) => {
  try {
    await Message.deleteMany({ recipient: req.user.id });
    res.json({ message: 'Tous les messages reçus ont été supprimés.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression des messages.', error: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'enseignant' })
      .select('prenom nom imageUrl')
      .lean();
    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: 'Aucun enseignant trouvé.' });
    }
    res.json(teachers);
  } catch (error) {
    console.error('Error in getTeachers:', error); // Add logging for debugging
    res.status(500).json({ message: 'Erreur lors de la récupération des enseignants.', error: error.message });
  }
};