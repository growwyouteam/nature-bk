const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save directly to client/public/uploads for simple local serving
        // Adjust path based on your folder structure relative to server/routes
        cb(null, '../client/public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'banner-' + Date.now() + path.extname(file.originalname));
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
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

        // Return path relative to public folder
        const filePath = `/uploads/${req.file.filename}`;
        res.json({ filePath });
    });
});

module.exports = router;
