const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
    getProductReviews
} = require('../controllers/productController');

// For now, using 'auth' middleware for admin routes. 
// Ideally, add an 'admin' middleware check (req.user.role === 'admin')

router.route('/:id/reviews').post(auth, createProductReview).get(getProductReviews);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', auth, createProduct);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;
