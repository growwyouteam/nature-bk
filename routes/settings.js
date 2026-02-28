const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/adminAuth');
const { getSettingByKey, updateSetting } = require('../controllers/settingController');

// @route   GET /api/settings/:key
// @desc    Get a specific setting
// @access  Public
router.get('/:key', getSettingByKey);

// @route   POST /api/settings
// @desc    Update or create a setting
// @access  Private/Admin
router.post('/', auth, admin, updateSetting);

module.exports = router;
