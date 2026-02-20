const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    registerPartner,
    getPartnerDashboard,
    getReferralLink
} = require('../controllers/partnerController');

// @route   POST /api/partners/register
router.post('/register', registerPartner);

// @route   GET /api/partners/dashboard
router.get('/dashboard', auth, getPartnerDashboard);

// @route   GET /api/partners/referral-link
router.get('/referral-link', auth, getReferralLink);

module.exports = router;
