const Message = require('../../Models/SystemeMessage/Message');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../../Models/AdminModels/User');
const Classe = require('../../Models/AdminModels/Classe');

const generateConversationId = (userId1, userId2) => {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'ID de destinataire invalide.' });
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
      await textMessage.populate('sender', 'prenom nom role imageUrl');
      await textMessage.populate('recipient', 'prenom nom role imageUrl');
      messages.push(textMessage);
    }

    // Handle uploaded files
    if (req.files) {
      const validImageExt = ['.jpeg', '.jpg', '.png'];
      const validAudioExt = ['.mp3', '.wav', '.ogg', '.webm', '.opus'];
      const validFileExt = ['.pdf', '.doc', '.docx'];

      for (const field of ['image', 'audio', 'file']) {
        if (req.files[field]) {
          const file = req.files[field][0];
          const fileUrl = `${req.protocol}://${req.get('host')}/Uploads/${file.filename}`;
          const ext = path.extname(file.filename).toLowerCase();
          let fileType;

          if (validImageExt.includes(ext)) {
            fileType = 'image';
          } else if (validAudioExt.includes(ext)) {
            fileType = 'audio';
          } else if (validFileExt.includes(ext)) {
            fileType = 'file';
          } else {
            return res.status(400).json({ message: `Type de fichier non supporté pour ${field}.` });
          }

          const fileMessage = new Message({
            sender: req.user.id,
            recipient: recipientId,
            conversationId,
            fileUrl,
            fileType,
            filename: file.originalname, // Ajout du nom original pour affichage
          });
          await fileMessage.save();
          await fileMessage.populate('sender', 'prenom nom role imageUrl');
          await fileMessage.populate('recipient', 'prenom nom role imageUrl');
          messages.push(fileMessage);
        }
      }
    }

    // Formater les messages pour inclure les URLs complètes
    const formattedMessages = messages.map(msg => ({
      ...msg.toObject(),
      fileUrl: msg.fileUrl && !msg.fileUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}${msg.fileUrl}`
        : msg.fileUrl,
      sender: {
        ...msg.sender.toObject(),
        imageUrl: msg.sender.imageUrl && !msg.sender.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${msg.sender.imageUrl}`
          : msg.sender.imageUrl || null,
      },
      recipient: {
        ...msg.recipient.toObject(),
        imageUrl: msg.recipient.imageUrl && !msg.recipient.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${msg.recipient.imageUrl}`
          : msg.recipient.imageUrl || null,
      },
    }));

    res.status(201).json(formattedMessages);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
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
          imageUrl: {
            $cond: {
              if: { $and: ['$sender.imageUrl', { $ne: ['$sender.imageUrl', ''] }] },
              then: { $concat: [`${req.protocol}://${req.get('host')}/Uploads/`, '$sender.imageUrl'] },
              else: null,
            },
          },
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
    console.error('Erreur lors de la récupération des expéditeurs de messages non lus:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des expéditeurs de messages non lus.', error: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID d\'utilisateur invalide.' });
    }
    const conversationId = generateConversationId(req.user.id, userId);
    const messages = await Message.find({ conversationId })
      .populate('sender', 'prenom nom role imageUrl')
      .populate('recipient', 'prenom nom role imageUrl')
      .sort({ createdAt: 1 })
      .lean();

    const updatedMessages = messages.map(msg => ({
      ...msg,
      fileUrl: msg.fileUrl && !msg.fileUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}${msg.fileUrl}`
        : msg.fileUrl,
      sender: {
        ...msg.sender,
        imageUrl: msg.sender.imageUrl && !msg.sender.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${msg.sender.imageUrl}`
          : msg.sender.imageUrl || 'https://via.placeholder.com/50?text=User',
      },
      recipient: {
        ...msg.recipient,
        imageUrl: msg.recipient.imageUrl && !msg.recipient.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${msg.recipient.imageUrl}`
          : msg.recipient.imageUrl || 'https://via.placeholder.com/50?text=User',
      },
    }));

    res.json(updatedMessages);
  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la conversation.', error: error.message });
  }
};

exports.getReceivedMessages = async (req, res) => {
  try {
    const messages = await Message.find({ recipient: req.user.id })
      .populate('sender', 'prenom nom role imageUrl')
      .sort({ createdAt: -1 })
      .lean();

    const updatedMessages = messages.map(msg => ({
      ...msg,
      fileUrl: msg.fileUrl && !msg.fileUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}${msg.fileUrl}`
        : msg.fileUrl,
      sender: {
        ...msg.sender,
        imageUrl: msg.sender.imageUrl && !msg.sender.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${msg.sender.imageUrl}`
          : msg.sender.imageUrl || null,
      },
    }));

    res.json(updatedMessages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages.', error: error.message });
  }
};

exports.getSentMessages = async (req, res) => {
  try {
    const messages = await Message.find({ sender: req.user.id })
      .populate('recipient', 'prenom nom role imageUrl')
      .sort({ createdAt: -1 })
      .lean();

    const updatedMessages = messages.map(msg => ({
      ...msg,
      fileUrl: msg.fileUrl && !msg.fileUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}${msg.fileUrl}`
        : msg.fileUrl,
      recipient: {
        ...msg.recipient,
        imageUrl: msg.recipient.imageUrl && !msg.recipient.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${msg.recipient.imageUrl}`
          : msg.recipient.imageUrl || null,
      },
    }));

    res.json(updatedMessages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages envoyés:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages envoyés.', error: error.message });
  }
};

exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error);
    res.status(500).json({ message: 'Erreur lors du comptage des messages non lus.', error: error.message });
  }
};

exports.markMessageAsRead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de message invalide.' });
    }
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé.' });
    }
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé.' });
    }
    message.read = true;
    await message.save();
    await message.populate('sender', 'prenom nom role imageUrl');
    await message.populate('recipient', 'prenom nom role imageUrl');
    const updatedMessage = {
      ...message.toObject(),
      fileUrl: message.fileUrl && !message.fileUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}${message.fileUrl}`
        : message.fileUrl,
      sender: {
        ...message.sender.toObject(),
        imageUrl: message.sender.imageUrl && !message.sender.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${message.sender.imageUrl}`
          : message.sender.imageUrl || null,
      },
      recipient: {
        ...message.recipient.toObject(),
        imageUrl: message.recipient.imageUrl && !message.recipient.imageUrl.startsWith('http')
          ? `${req.protocol}://${req.get('host')}/Uploads/${message.recipient.imageUrl}`
          : message.recipient.imageUrl || null,
      },
    };
    res.json(updatedMessage);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du message:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du message.', error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de message invalide.' });
    }
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
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du message.', error: error.message });
  }
};

exports.deleteAllReceivedMessages = async (req, res) => {
  try {
    await Message.deleteMany({ recipient: req.user.id });
    res.json({ message: 'Tous les messages reçus ont été supprimés.' });
  } catch (error) {
    console.error('Erreur lors de la suppression des messages:', error);
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
    const updatedTeachers = teachers.map(teacher => ({
      ...teacher,
      imageUrl: teacher.imageUrl && !teacher.imageUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}/Uploads/${teacher.imageUrl}`
        : teacher.imageUrl || null,
    }));
    res.json(updatedTeachers);
  } catch (error) {
    console.error('Erreur lors de la récupération des enseignants:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des enseignants.', error: error.message });
  }
};

exports.getTeachersForParent = async (req, res) => {
  try {
    const parent = await User.findById(req.user.id).lean();
    if (!parent || parent.role !== 'parent') {
      return res.status(403).json({ message: 'Accès non autorisé.' });
    }

    // Récupérer les classes des enfants
    const children = await User.find({ _id: { $in: parent.enfants } }).lean();
    const classeIds = children.map(child => child.classe?._id).filter(id => id);
    
    // Récupérer les enseignants associés aux classes
    const classes = await Classe.find({ _id: { $in: classeIds } }).lean();
    const teacherIds = classes.map(classe => classe.enseignant).filter(id => id);
    
    // Récupérer les enseignants
    const teachers = await User.find({ _id: { $in: teacherIds }, role: 'enseignant' })
      .select('prenom nom imageUrl')
      .lean();

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: 'Aucun enseignant trouvé pour vos enfants.' });
    }

    const updatedTeachers = teachers.map(teacher => ({
      ...teacher,
      imageUrl: teacher.imageUrl && !teacher.imageUrl.startsWith('http')
        ? `${req.protocol}://${req.get('host')}/Uploads/${teacher.imageUrl}`
        : teacher.imageUrl || null,
    }));

    res.json(updatedTeachers);
  } catch (error) {
    console.error('Erreur lors de la récupération des enseignants pour le parent:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des enseignants.', error: error.message });
  }
};