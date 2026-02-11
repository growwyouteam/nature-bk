const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    addOrderItems,
    getOrderById,
    getMyOrders,
    getOrders,
    updateOrderToDelivered,
    updateOrderStatus,
    getOrderInvoice
} = require('../controllers/orderController');

router.route('/').post(auth, addOrderItems).get(auth, getOrders); // Protected Admin check middleware ideally for get
router.route('/myorders').get(auth, getMyOrders);
router.route('/:id').get(auth, getOrderById);
router.route('/:id/deliver').put(auth, updateOrderToDelivered);
router.route('/:id/status').put(auth, updateOrderStatus); // New generic status update
router.route('/:id/invoice').get(auth, getOrderInvoice); // Invoice download

module.exports = router;
