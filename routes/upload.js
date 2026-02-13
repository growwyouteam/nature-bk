const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nature-app/banners', // Folder in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: (req, file) => 'banner-' + Date.now(), // Custom filename
    },
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 } // 5MB
}).single('image');

// @route   POST /api/upload
// @desc    Upload an image
// @access  Public (or Private if you add auth middleware)
router.post('/', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ msg: err.message });
        } else if (err) {
            return res.status(400).json({ msg: err });
        }

        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        // Return Cloudinary URL
        const filePath = req.file.path; // Multer-storage-cloudinary puts URL in path
        res.json({ filePath });
    });
});

module.exports = router;
