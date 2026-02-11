const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getUserPurchasedEbooks,
    getUserPurchasedCourses,
    downloadEbook,
    accessCourse,
    checkPurchase
} = require('../controllers/purchaseController');

// @route   GET /api/purchases/ebooks
// @desc    Get user's purchased e-books
// @access  Private
router.get('/ebooks', auth, getUserPurchasedEbooks);

// @route   GET /api/purchases/courses
// @desc    Get user's purchased courses
// @access  Private
router.get('/courses', auth, getUserPurchasedCourses);

// @route   GET /api/purchases/ebooks/:id/download
// @desc    Download purchased e-book
// @access  Private
router.get('/ebooks/:id/download', auth, downloadEbook);

// @route   GET /api/purchases/courses/:id
// @desc    Access purchased course
// @access  Private
router.get('/courses/:id', auth, accessCourse);

// @route   GET /api/purchases/check/:type/:id
// @desc    Check if user has purchased an item
// @access  Private
router.get('/check/:type/:id', auth, checkPurchase);

module.exports = router;
