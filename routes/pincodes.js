const express = require('express');
const router = express.Router();
const Pincode = require('../models/Pincode');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminAuth');

// @route   GET /api/pincodes/check/:code
// @desc    Check if pincode is serviceable
// @access  Public
router.get('/check/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const pincode = await Pincode.findOne({ code, isActive: true });

        if (pincode) {
            // Simplified delivery logic: 3-5 days standard
            const estimatedDate = new Date();
            estimatedDate.setDate(estimatedDate.getDate() + 4);

            return res.json({
                serviceable: true,
                pincode: pincode.code,
                city: pincode.city,
                state: pincode.state,
                estimatedDate: estimatedDate.toDateString(),
                message: "Delivery available!"
            });
        } else {
            return res.json({
                serviceable: false,
                message: "Sorry, we do not deliver to this pincode yet."
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/pincodes
// @desc    Get all pincodes (for Admin)
// @access  Private/Admin
router.get('/', auth, admin, async (req, res) => {
    try {
        const pincodes = await Pincode.find().sort({ createdAt: -1 });
        res.json(pincodes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/pincodes
// @desc    Add a pincode
// @access  Private/Admin
router.post('/', auth, admin, async (req, res) => {
    const { code, city, state } = req.body;

    // Simple validation
    if (!code || !city || !state) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let pincode = await Pincode.findOne({ code });
        if (pincode) {
            return res.status(400).json({ msg: 'Pincode already exists' });
        }

        pincode = new Pincode({
            code,
            city,
            state
        });

        await pincode.save();
        res.json(pincode);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/pincodes/:id
// @desc    Delete a pincode
// @access  Private/Admin
router.delete('/:id', auth, admin, async (req, res) => {
    try {
        const pincode = await Pincode.findById(req.params.id);

        if (!pincode) {
            return res.status(404).json({ msg: 'Pincode not found' });
        }

        await pincode.deleteOne();
        res.json({ msg: 'Pincode removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
