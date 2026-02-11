const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderItems: [
        {
            name: { type: String, required: true },
            qty: { type: Number, required: true },
            image: { type: String, required: true },
            price: { type: Number, required: true },
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            pack: { type: String }, // Optional: pack details

            // Digital Content Support
            itemType: {
                type: String,
                enum: ['product', 'ebook', 'course'],
                default: 'product'
            },
            ebook: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Ebook'
            },
            course: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Course'
            }
        }
    ],
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true }
    },
    paymentMethod: {
        type: String,
        required: true,
        default: 'COD' // or 'Online'
    },
    paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String },
        email_address: { type: String }
    },
    taxPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false
    },
    paidAt: {
        type: Date
    },
    isDelivered: {
        type: Boolean,
        required: true,
        default: false
    },
    deliveredAt: {
        type: Date
    },
    status: {
        type: String,
        default: 'Processing' // Processing, Shipped, Delivered, Cancelled
    },

    // Referral Tracking
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Partner who referred this order
    },
    referralCode: {
        type: String // Referral code used at the time of order
    },
    commissionGenerated: {
        type: Boolean,
        default: false // Whether commission entry was created
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
