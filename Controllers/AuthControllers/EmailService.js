const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendConfirmationEmail = async (user) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Inscription Confirmée',
    html: `
      <h2>Bienvenue, ${user.prenom} ${user.nom} !</h2>
      <p>Votre inscription en tant que ${user.role} a été approuvée.</p>
      <p>Vous pouvez maintenant vous connecter à votre compte à l'adresse suivante : <a href="http://localhost:3000/login">Se connecter</a></p>
      <p>Merci de rejoindre notre plateforme !</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${user.email}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw new Error('Erreur lors de l\'envoi de l\'email de confirmation');
  }
};

module.exports = { sendConfirmationEmail };