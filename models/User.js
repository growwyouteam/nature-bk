const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'partner'], default: 'user' },

    // Profile
    phone: String,
    avatar: String, // Cloudinary URL

    // Partner/Referral Data (only for partners)
    isPartner: { type: Boolean, default: false },
    referralCode: { type: String, unique: true, sparse: true }, // Unique referral code
    commissionRate: { type: Number, default: 0 }, // Commission percentage (set by admin)
    totalEarnings: { type: Number, default: 0 }, // Total commission earned
    pendingCommission: { type: Number, default: 0 }, // Pending approval
    paidCommission: { type: Number, default: 0 }, // Already paid out

    // Shopping Data
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    cart: [{ // Persistent Cart
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        packId: String, // To identify specific pack variant
        quantity: { type: Number, default: 1 }
    }],

    // Purchased Digital Content
    purchasedEbooks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ebook'
    }],
    purchasedCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],

    addresses: [{
        label: String, // Home, Work
        street: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: { type: Boolean, default: false }
    }]
}, { timestamps: true });

// Password Hash Middleware
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Password Compare Method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
