const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
    getEbooks,
    getEbookById,
    getEbookBySlug,
    createEbook,
    updateEbook,
    deleteEbook
} = require('../controllers/ebookController');

router.get('/', getEbooks);
router.get('/slug/:slug', getEbookBySlug);
router.get('/:id', getEbookById);
router.post('/', adminAuth, createEbook);
router.put('/:id', adminAuth, updateEbook);
router.delete('/:id', adminAuth, deleteEbook);

module.exports = router;
