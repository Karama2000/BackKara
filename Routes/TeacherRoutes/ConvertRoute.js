const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');

router.post('/convert-to-mp3', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const inputPath = path.join(__dirname, '../Uploads', filename);
    const outputPath = path.join(__dirname, '../Uploads', `${path.basename(filename, path.extname(filename))}.converted.mp3`);

    try {
      await fs.access(inputPath);
    } catch {
      return res.status(404).json({ error: 'Source file not found' });
    }

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .format('mp3')
        .on('end', resolve)
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .save(outputPath);
    });

    res.json({
      convertedUrl: path.basename(outputPath),
      message: 'Audio converted to MP3 successfully',
    });
  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: `Audio conversion failed: ${err.message}` });
  }
});

module.exports = router;