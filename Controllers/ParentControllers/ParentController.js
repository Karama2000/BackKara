const Parent = require('../../Models/AdminModels/Parent');
  const Eleve = require('../../Models/AdminModels/Eleve');

 exports.getChildren = async (req, res) => {
  try {
    console.log('Fetching children for user ID:', req.user._id);
    const parent = await Parent.findById(req.user._id).populate({
      path: 'enfants',
      populate: [
        { path: 'niveau', select: 'nom' },
        { path: 'classe', select: 'nom' },
      ],
    });

    if (!parent) {
      console.log('Parent not found for ID:', req.user._id);
      return res.status(404).json({ message: 'Parent non trouvé.' });
    }

    console.log('Parent document:', parent);
    const children = parent.enfants && parent.enfants.length > 0
      ? parent.enfants.map((child) => ({
          _id: child._id,
          nom: child.nom,
          prenom: child.prenom,
          niveau: child.niveau?.nom || 'N/A',
          classe: child.classe?.nom || 'N/A',
          numInscript: child.numInscript || 'N/A',
          imageUrl: child.imageUrl ? `http://localhost:5000/Uploads/${child.imageUrl}` : null,
        }))
      : [];

    console.log('Children retrieved:', children);
    res.status(200).json(children);
  } catch (error) {
    console.error('Erreur lors de la récupération des enfants:', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};