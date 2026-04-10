const Franchise = require('../models/Franchise');

// @desc    Submit Franchise Inquiry
// @route   POST /api/franchise
// @access  Public
exports.submitInquiry = async (req, res) => {
    try {
        const { name, email, phone, budget, city, message } = req.body;

        if (!name || !email || !phone || !budget || !city) {
            return res.status(400).json({ msg: 'Please provide all details' });
        }

        const inquiry = await Franchise.create({
            name,
            email,
            phone,
            budget,
            city,
            message
        });

        res.status(201).json({ success: true, inquiry });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get All Franchise Inquiries
// @route   GET /api/franchise/admin
// @access  Private/Admin
exports.getAllInquiries = async (req, res) => {
    try {
        const inquiries = await Franchise.find().sort({ createdAt: -1 });
        res.json(inquiries);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Inquiry Status
// @route   PUT /api/franchise/admin/:id
// @access  Private/Admin
exports.updateInquiryStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;
        const inquiry = await Franchise.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ msg: 'Inquiry not found' });
        }

        if (status) inquiry.status = status;
        if (notes !== undefined) inquiry.notes = notes;

        await inquiry.save();
        res.json(inquiry);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete Franchise Inquiry
// @route   DELETE /api/franchise/admin/:id
// @access  Private/Admin
exports.deleteInquiry = async (req, res) => {
    try {
        await Franchise.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Inquiry removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
