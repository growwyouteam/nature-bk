const mongoose = require('mongoose');

const bannerSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: {
        type: String, // URL to image
        required: true
    },
    link: {
        type: String,
        default: '/products'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
