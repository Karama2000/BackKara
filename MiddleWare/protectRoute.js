const jwt = require('jsonwebtoken');
const User = require('../Models/AdminModels/User');

const protectRoute = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received:', token);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        console.error('User not found for ID:', decoded.id);
        return res.status(401).json({ message: 'Utilisateur non trouvé.' });
      }
      if (req.originalUrl.includes('/pending-users') || req.originalUrl.includes('/approve-user') || req.originalUrl.includes('/reject-user')) {
        if (req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
        }
      }
      console.log('User set:', req.user);
      req.user.userId = req.user._id.toString();
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expiré, veuillez vous reconnecter.' });
      }
      return res.status(401).json({ message: 'Non autorisé, token invalide.' });
    }
  } else {
    console.error('No token provided in headers:', req.headers);
    return res.status(401).json({ message: 'Non autorisé, aucun token fourni.' });
  }
};

module.exports = protectRoute;