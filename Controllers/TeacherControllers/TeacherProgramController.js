// Controllers/programController.js
const Program = require('../../Models/AdminModels/Program');
const Unit = require('../../Models/AdminModels/Unite');

const programController = {
  // Create a program with its units
  create: async (req, res) => {
    const { niveauId, title, description, units } = req.body;

    try {
      // Validate niveauId
      const program = await Program.create({ niveauId, title, description });
      
      // Create units if provided
      if (units && Array.isArray(units)) {
        const unitDocs = units.map(unit => ({
          programId: program._id,
          title: unit.title,
          description: unit.description || '',
        }));
        await Unit.insertMany(unitDocs);
      }

      res.status(201).json(program);
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la création du programme', error: err.message });
    }
  },

  // Get all programs, optionally filtered by niveauId
  getAll: async (req, res) => {
    try {
      const { niveauId } = req.query; // Optional query parameter to filter by niveauId

      // Build query
      const query = niveauId ? { niveauId } : {};

      // Fetch programs and populate niveauId
      const programs = await Program.find(query).populate('niveauId');

      // Fetch units for each program
      const programIds = programs.map(program => program._id);
      const units = await Unit.find({ programId: { $in: programIds } });

      // Combine programs with their units
      const programsWithUnits = programs.map(program => ({
        ...program.toObject(),
        units: units.filter(unit => unit.programId.toString() === program._id.toString()),
      }));

      res.status(200).json(programsWithUnits);
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la récupération des programmes', error: err.message });
    }
  },
};

module.exports = { programController };