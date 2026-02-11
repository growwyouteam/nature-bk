const Offer = require('../models/Offer');

// @desc    Get all offers
// @route   GET /api/offers
// @access  Public
exports.getOffers = async (req, res) => {
    try {
        // Retrieve active offers. Admin might want all, but for now let's return all and filter in frontend or query param
        const offers = await Offer.find({}).sort({ createdAt: -1 });
        res.json(offers);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private/Admin
exports.createOffer = async (req, res) => {
    try {
        const { code, title, description, discountType, discountValue, minOrderValue, startDate, endDate, isActive, applicableTo, applicableProducts, applicableCategories } = req.body;

        const offerExists = await Offer.findOne({ code });
        if (offerExists) {
            return res.status(400).json({ msg: 'Offer code already exists' });
        }

        const offer = new Offer({
            code,
            title,
            description,
            discountType,
            discountValue,
            minOrderValue,
            startDate,
            endDate,
            minOrderValue,
            startDate,
            endDate,
            isActive,
            applicableTo,
            applicableProducts,
            applicableCategories
        });

        await offer.save();
        res.status(201).json(offer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update an offer
// @route   PUT /api/offers/:id
// @access  Private/Admin
exports.updateOffer = async (req, res) => {
    try {
        const { code, title, description, discountType, discountValue, minOrderValue, startDate, endDate, isActive, applicableTo, applicableProducts, applicableCategories } = req.body;

        let offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ msg: 'Offer not found' });
        }

        if (code && code !== offer.code) {
            const codeExists = await Offer.findOne({ code });
            if (codeExists) return res.status(400).json({ msg: 'Offer code already exists' });
            offer.code = code;
        }

        if (title) offer.title = title;
        if (description) offer.description = description;
        if (discountType) offer.discountType = discountType;
        if (discountValue) offer.discountValue = discountValue;
        if (minOrderValue !== undefined) offer.minOrderValue = minOrderValue;
        if (startDate) offer.startDate = startDate;
        if (endDate) offer.endDate = endDate;
        if (isActive !== undefined) offer.isActive = isActive;
        if (applicableTo) offer.applicableTo = applicableTo;
        if (applicableProducts) offer.applicableProducts = applicableProducts;
        if (applicableCategories) offer.applicableCategories = applicableCategories;

        await offer.save();
        res.json(offer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete an offer
// @route   DELETE /api/offers/:id
// @access  Private/Admin
exports.deleteOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ msg: 'Offer not found' });
        }

        await offer.deleteOne();
        res.json({ msg: 'Offer removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
