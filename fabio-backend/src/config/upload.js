// src/config/upload.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Garante que a pasta existe
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),

  filename: (_req, file, cb) => {
    // Gera nome único: timestamp + 6 chars aleatórios + extensão original
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `comprovante-${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato inválido. Use JPG, PNG, WEBP ou PDF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_MB) || 10) * 1024 * 1024,
  },
});

module.exports = upload;