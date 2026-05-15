const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Cloudinary storage for PDFs
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nature-app/ebooks',
        resource_type: 'raw', // Critical for non-image files like PDF
        public_id: (req, file) => 'ebook-' + Date.now(),
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20000000 } // 20MB for PDFs
}).single('pdf');

router.post('/', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ msg: err.message || err });
        }
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }
        res.json({ filePath: req.file.path });
    });
});

module.exports = router;
