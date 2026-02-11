const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tagline: { type: String },
    description: { type: String }, // HTML supported

    // Pricing & Stock
    mrp: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    sku: { type: String },

    // Category
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },

    // Media (Cloudinary URLs)
    images: [{
        url: String,
        alt: String,
        type: { type: String, enum: ['product', 'packaging', 'ingredient'], default: 'product' }
    }],

    // Attributes
    benefits: [{
        icon: String, // Heroicon name or Image URL
        text: String
    }],
    ingredients: { type: String }, // HTML detail
    howToUse: { type: String },
    disclaimer: { type: String },
    faqs: [{
        question: String,
        answer: String
    }],

    // SEO
    metaTitle: String,
    metaDescription: String,

    // Variations / Packs
    packs: [{
        name: { type: String, required: true }, // e.g., "Starter Pack", "Monthly Pack"
        quantity: { type: String }, // e.g., "30 Capsules"
        price: { type: Number, required: true },
        mrp: { type: Number }, // To show savings per pack
        isDefault: { type: Boolean, default: false }
    }],

    // Relations
    frequentlyBoughtTogether: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],

    // Ratings (Aggregated)
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Metadata
    isActive: { type: Boolean, default: true },
    sections: { // Toggle sections
        showBenefits: { type: Boolean, default: true },
        showIngredients: { type: Boolean, default: true },
        showReviews: { type: Boolean, default: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
