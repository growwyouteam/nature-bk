const express = require('express');
const router = express.Router();
const { 
    submitInquiry, 
    getAllInquiries, 
    updateInquiryStatus, 
    deleteInquiry 
} = require('../controllers/franchiseController');
const adminAuth = require('../middleware/adminAuth');

// Public route
router.post('/', submitInquiry);

// Admin routes
router.get('/admin', adminAuth, getAllInquiries);
router.put('/admin/:id', adminAuth, updateInquiryStatus);
router.delete('/admin/:id', adminAuth, deleteInquiry);

module.exports = router;
