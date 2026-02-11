const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
    partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    orderAmount: {
        type: Number,
        required: true
    },
    commissionRate: {
        type: Number,
        required: true // Percentage at the time of order
    },
    commissionAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin who approved
    },
    approvedAt: {
        type: Date
    },
    paidAt: {
        type: Date
    },
    notes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Commission', commissionSchema);
