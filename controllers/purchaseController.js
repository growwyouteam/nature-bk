const User = require('../models/User');
const Ebook = require('../models/Ebook');
const Course = require('../models/Course');
const Order = require('../models/Order');

// @desc    Get user's purchased e-books
// @route   GET /api/purchases/ebooks
// @access  Private
exports.getUserPurchasedEbooks = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('purchasedEbooks');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user.purchasedEbooks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Get user's purchased courses
// @route   GET /api/purchases/courses
// @access  Private
exports.getUserPurchasedCourses = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('purchasedCourses');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user.purchasedCourses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Download purchased e-book
// @route   GET /api/purchases/ebooks/:id/download
// @access  Private
exports.downloadEbook = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const ebookId = req.params.id;

        // Check if user has purchased this e-book
        const hasPurchased = user.purchasedEbooks.includes(ebookId);

        if (!hasPurchased) {
            return res.status(403).json({ msg: 'You have not purchased this e-book' });
        }

        // Get e-book details
        const ebook = await Ebook.findById(ebookId);

        if (!ebook) {
            return res.status(404).json({ msg: 'E-book not found' });
        }

        if (!ebook.pdfFile) {
            return res.status(404).json({ msg: 'PDF file not available' });
        }

        // Return PDF URL (Cloudinary URL)
        res.json({
            title: ebook.title,
            pdfUrl: ebook.pdfFile,
            downloadUrl: ebook.pdfFile // Cloudinary URL can be used directly for download
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Access purchased course
// @route   GET /api/purchases/courses/:id
// @access  Private
exports.accessCourse = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const courseId = req.params.id;

        // Check if user has purchased this course
        const hasPurchased = user.purchasedCourses.includes(courseId);

        if (!hasPurchased) {
            return res.status(403).json({ msg: 'You have not purchased this course' });
        }

        // Get course details with all modules
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // Return full course data including modules
        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Check if user has purchased an item
// @route   GET /api/purchases/check/:type/:id
// @access  Private
exports.checkPurchase = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const { type, id } = req.params;

        let hasPurchased = false;

        if (type === 'ebook') {
            hasPurchased = user.purchasedEbooks.includes(id);
        } else if (type === 'course') {
            hasPurchased = user.purchasedCourses.includes(id);
        }

        res.json({ hasPurchased });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};
