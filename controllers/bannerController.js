const Banner = require('../models/Banner');

// @desc    Get all active banners
// @route   GET /api/banners
// @access  Public
exports.getBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true });
        res.json(banners);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/Admin
exports.createBanner = async (req, res) => {
    try {
        const { title, image, link } = req.body;
        const banner = new Banner({ title, image, link });
        await banner.save();
        res.status(201).json(banner);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ msg: 'Invalid Banner ID' });
        }
        const banner = await Banner.findById(req.params.id);
        if (banner) {
            await banner.deleteOne();
            res.json({ msg: 'Banner removed' });
        } else {
            res.status(404).json({ msg: 'Banner not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
