const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

// Initialize Razorpay only if keys are present to prevent server crash during dev
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
    console.warn("Razorpay keys missing. Payment features will fail.");
}

// @desc    Create Razorpay Order
// @route   POST /api/payment/order
// @access  Private
exports.createPaymentOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;

        const options = {
            amount: amount * 100, // Amount in smallest currency unit (paise)
            currency,
            receipt
        };

        if (!razorpay) {
            return res.status(500).json({ message: "Payment configuration missing on server" });
        }
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).send(error);
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment verified - Update Order
            const order = await Order.findById(orderId);
            if (order) {
                order.isPaid = true;
                order.paidAt = Date.now();
                order.paymentResult = {
                    id: razorpay_payment_id,
                    status: 'success',
                    update_time: Date.now(),
                    email_address: req.user.email
                };
                await order.save();
                res.json({ success: true, message: "Payment Verified", orderId: order._id });
            } else {
                // Even if payment verified, if local order not found, it's an issue but payment is done.
                // Ideally this case shouldn't happen if flow is correct.
                res.status(404).json({ success: false, message: "Order not found to update" });
            }
        } else {
            res.status(400).json({ success: false, message: "Invalid Signature" });
        }
    } catch (error) {
        console.error("Payment Verify Error:", error);
        res.status(500).send(error);
    }
};
