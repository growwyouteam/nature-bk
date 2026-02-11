const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
    getDashboardStats,
    getAllReviews,
    updateReviewStatus,
    deleteReview,
    getAllPartners,
    getPartnerDetails,
    updatePartnerCommissionRate,
    getAllCommissions,
    approveCommission,
    rejectCommission,
    markCommissionPaid
} = require('../controllers/adminController');

// All routes here are protected and admin-only
router.get('/stats', adminAuth, getDashboardStats);

router.get('/reviews', adminAuth, getAllReviews);
router.put('/reviews/:id', adminAuth, updateReviewStatus);
router.delete('/reviews/:id', adminAuth, deleteReview);

// Partner Management
router.get('/partners', adminAuth, getAllPartners);
router.get('/partners/:id', adminAuth, getPartnerDetails);
router.put('/partners/:id/commission-rate', adminAuth, updatePartnerCommissionRate);

// Commission Management
router.get('/commissions', adminAuth, getAllCommissions);
router.put('/commissions/:id/approve', adminAuth, approveCommission);
router.put('/commissions/:id/reject', adminAuth, rejectCommission);
router.put('/commissions/:id/paid', adminAuth, markCommissionPaid);

module.exports = router;
