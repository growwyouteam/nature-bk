const Ebook = require('../models/Ebook');

// @desc    Get all ebooks
// @route   GET /api/ebooks
// @access  Public
exports.getEbooks = async (req, res) => {
    try {
        const ebooks = await Ebook.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(ebooks);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get ebook by ID
// @route   GET /api/ebooks/:id
// @access  Public
exports.getEbookById = async (req, res) => {
    try {
        const ebook = await Ebook.findById(req.params.id);
        if (!ebook) {
            return res.status(404).json({ msg: 'Ebook not found' });
        }
        res.json(ebook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Create ebook
// @route   POST /api/ebooks
// @access  Private/Admin
exports.createEbook = async (req, res) => {
    try {
        const ebookData = req.body;

        // Auto-generate slug if not provided
        if (!ebookData.slug && ebookData.title) {
            ebookData.slug = ebookData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        }

        const ebook = new Ebook(ebookData);
        await ebook.save();
        res.status(201).json(ebook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update ebook
// @route   PUT /api/ebooks/:id
// @access  Private/Admin
exports.updateEbook = async (req, res) => {
    try {
        const ebook = await Ebook.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!ebook) {
            return res.status(404).json({ msg: 'Ebook not found' });
        }

        res.json(ebook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete ebook
// @route   DELETE /api/ebooks/:id
// @access  Private/Admin
exports.deleteEbook = async (req, res) => {
    try {
        await Ebook.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Ebook removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
// @desc    Get ebook by Slug
// @route   GET /api/ebooks/slug/:slug
// @access  Public
exports.getEbookBySlug = async (req, res) => {
    try {
        const ebook = await Ebook.findOne({ slug: req.params.slug });
        if (!ebook) {
            return res.status(404).json({ msg: 'Ebook not found' });
        }
        res.json(ebook);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
