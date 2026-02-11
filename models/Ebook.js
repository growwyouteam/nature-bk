const mongoose = require('mongoose');

const ebookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    author: {
        type: String
    },
    // Media (Cloudinary URLs)
    images: [{
        url: String,
        alt: String
    }],
    coverImage: {
        type: String // Deprecated or Main Image
    },
    pdfFile: {
        type: String // Cloudinary URL for PDF
    },
    price: {
        type: Number,
        default: 0
    },
    mrp: {
        type: Number
    },
    pages: {
        type: Number
    },
    language: {
        type: String,
        default: 'English'
    },
    category: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFree: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Ebook', ebookSchema);
