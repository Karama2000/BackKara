// Controllers/AdminControllers/UnitController.js
const Unit = require('../../Models/AdminModels/Unite');
const Program = require('../../Models/AdminModels/Program');
const Joi = require('joi');

// Validation schema for unit creation and update
const unitSchema = Joi.object({
  programId: Joi.string().required().messages({
    'string.empty': 'L\'ID du programme est requis',
    'any.required': 'L\'ID du programme est requis',
  }),
  title: Joi.string().required().messages({
    'string.empty': 'Le titre est requis',
    'any.required': 'Le titre est requis',
  }),
  description: Joi.string().allow('').optional(),
});

exports.getAllUnits = async (req, res) => {
  try {
    const units = await Unit.find().populate('programId', 'title niveauId');
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des unités', error: error.message });
  }
};

exports.getUnitById = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }
    const unit = await Unit.findById(req.params.id).populate('programId', 'title niveauId');
    if (unit) {
      res.json(unit);
    } else {
      res.status(404).json({ message: 'Unité non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'unité', error: error.message });
  }
};

exports.createUnit = async (req, res) => {
  console.log('Creating unit with data:', req.body); // For debugging
  const { error } = unitSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const program = await Program.findById(req.body.programId);
    if (!program) {
      return res.status(400).json({ message: 'Programme non trouvé' });
    }

    const unit = new Unit({
      programId: req.body.programId,
      title: req.body.title,
      description: req.body.description,
    });

    const newUnit = await unit.save();
    const populatedUnit = await Unit.findById(newUnit._id).populate('programId', 'title niveauId');
    res.status(201).json(populatedUnit);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création de l\'unité', error: error.message });
  }
};

exports.updateUnit = async (req, res) => {
  console.log('Updating unit with data:', req.body); // For debugging
  const { error } = unitSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Unité non trouvée' });
    }

    if (req.body.programId) {
      const program = await Program.findById(req.body.programId);
      if (!program) {
        return res.status(400).json({ message: 'Programme non trouvé' });
      }
    }

    unit.programId = req.body.programId || unit.programId;
    unit.title = req.body.title || unit.title;
    unit.description = req.body.description || unit.description;

    const updatedUnit = await unit.save();
    const populatedUnit = await Unit.findById(updatedUnit._id).populate('programId', 'title niveauId');
    res.json(populatedUnit);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour de l\'unité', error: error.message });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Unité non trouvée' });
    }

    await unit.deleteOne();
    res.json({ message: 'Unité supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'unité', error: error.message });
  }
};