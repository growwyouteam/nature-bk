const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
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
    instructor: {
        type: String
    },
    thumbnail: {
        type: String // Cloudinary URL
    },
    price: {
        type: Number,
        default: 0
    },
    mrp: {
        type: Number
    },
    duration: {
        type: String // e.g., "4 weeks", "10 hours"
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    category: {
        type: String,
        required: true
    },
    modules: [{
        title: String,
        description: String,
        videoUrl: String, // Cloudinary or YouTube URL
        duration: String,
        order: Number
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isFree: {
        type: Boolean,
        default: false
    },
    enrolledCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
