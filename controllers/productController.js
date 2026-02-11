const Product = require('../models/Product');
const Review = require('../models/Review');

// @desc    Create new review

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createProductReview = async (req, res) => {
    const { rating, comment } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            const alreadyReviewed = await Review.findOne({
                product: req.params.id,
                user: req.user.id
            });

            if (alreadyReviewed) {
                return res.status(400).json({ msg: 'Product already reviewed' });
            }

            const review = new Review({
                user: req.user.id,
                product: req.params.id,
                rating: Number(rating),
                comment,
                isApproved: false // Require moderation or auto-approve? Let's say false for now to test moderation.
            });

            await review.save();

            // Recalculate Average (Simpler approach: Just fetch all approved reviews and avg them)
            // But for now since we have a separate collection, we need to aggregate.
            // Or simpler: Push to separate array if we had one. 
            // Better: We will recalculate averages when reviews are APPROVED. 
            // So for now just save the review.

            res.status(201).json({ msg: 'Review added' });
        } else {
            res.status(404).json({ msg: 'Product not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get product reviews
// @route   GET /api/products/:id/reviews
// @access  Public
exports.getProductReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.id, isApproved: true })
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single product by ID or Slug
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
    try {
        // Try finding by ID first, if not valid ID, try slug
        let product;
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(req.params.id);
        } else {
            product = await Product.findOne({ slug: req.params.id });
        }

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
    // Basic validation could go here
    try {
        const newProduct = new Product(req.body);
        const product = await newProduct.save();
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        await product.deleteOne(); // or findByIdAndDelete
        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
