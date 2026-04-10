const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    budget: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'resolved', 'rejected'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Franchise', franchiseSchema);
