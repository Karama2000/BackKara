// Routes/AuthRoutes/AuthRoute.js
const express = require('express');
const { register } = require('../../Controllers/AuthControllers/Register');
const { login } = require('../../Controllers/AuthControllers/Login');
const { confirmEmail } = require('../../Controllers/AuthControllers/ConfirmEmail');
const { resetPassword, resetPasswordConfirm } = require('../../Controllers/AuthControllers/MdpOublie');

const authRoute = express.Router();

authRoute.post('/register', register);
authRoute.post('/login', login);
authRoute.post('/reset-password', resetPassword);
authRoute.post('/reset-password-confirm', resetPasswordConfirm);
authRoute.get('/confirm-email/:token', confirmEmail);
// authRoute.get('/confirm-email/:userId', async (req, res) => {
//   try {
//     const user = await require('../../Models/AdminModels/User').findById(req.params.userId);
//     if (!user) {
//       return res.status(400).json({ message: 'Utilisateur non trouvé' });
//     }
//     if (user.status === 'pending') {
//       user.status = 'active'; // Activer le compte
//       await user.save();
//       res.status(200).json({ message: 'Compte activé avec succès' });
//     } else {
//       res.status(400).json({ message: 'Compte déjà activé ou rejeté' });
//     }
//   } catch (error) {
//     console.error('Erreur lors de la confirmation d\'email:', error);
//     res.status(500).json({ message: 'Erreur serveur' });
//   }
// }
// );

module.exports = authRoute;