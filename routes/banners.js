const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBanners, createBanner, deleteBanner } = require('../controllers/bannerController');

router.get('/', getBanners);
router.post('/', auth, createBanner);
router.delete('/:id', auth, deleteBanner);

module.exports = router;
