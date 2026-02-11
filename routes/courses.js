const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
    getCourses,
    getCourseById,
    getCourseBySlug,
    createCourse,
    updateCourse,
    deleteCourse
} = require('../controllers/courseController');

router.get('/', getCourses);
router.get('/slug/:slug', getCourseBySlug);
router.get('/:id', getCourseById);
router.post('/', adminAuth, createCourse);
router.put('/:id', adminAuth, updateCourse);
router.delete('/:id', adminAuth, deleteCourse);

module.exports = router;
