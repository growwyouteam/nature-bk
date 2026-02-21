const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { registerUser, loginUser, getUserProfile, validateReferralCode } = require('../controllers/authController');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, getUserProfile);

// @route   GET api/auth/validate-referral/:code
// @desc    Check referral code and get referrer info
// @access  Public
router.get('/validate-referral/:code', validateReferralCode);

module.exports = router;
