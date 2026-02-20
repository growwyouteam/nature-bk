const User = require('../models/User');
const Commission = require('../models/Commission');
const Order = require('../models/Order');

// Helper function to generate unique referral code
async function generateUniqueReferralCode(name) {
    const baseCode = name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check if code already exists
    const exists = await User.findOne({ referralCode: baseCode });

    if (exists) {
        // Recursively generate new code if exists
        return generateUniqueReferralCode(name);
    }

    return baseCode;
}

// @desc    Register as Partner
// @route   POST /api/partners/register
// @access  Public
const registerPartner = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists with this email' });
        }

        // Generate unique referral code
        const referralCode = await generateUniqueReferralCode(name);

        // Create partner user
        const partner = await User.create({
            name,
            email,
            password,
            phone,
            role: 'partner',
            isPartner: true,
            referralCode,
            commissionRate: 10 // Default 10%, admin can change later
        });

        res.status(201).json({
            _id: partner._id,
            name: partner.name,
            email: partner.email,
            role: partner.role,
            referralCode: partner.referralCode,
            commissionRate: partner.commissionRate
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Get Partner Dashboard Data
// @route   GET /api/partners/dashboard
// @access  Private (Partner only)
const getPartnerDashboard = async (req, res) => {
    try {
        const partnerId = req.user.id;

        // Get partner details
        const partner = await User.findById(partnerId).select('-password');

        if (!partner) {
            return res.status(404).json({ msg: 'Partner profile not found' });
        }

        // Auto-generate referral code if missing (lazy migration)
        if (!partner.referralCode) {
            const referralCode = await generateUniqueReferralCode(partner.name);
            partner.referralCode = referralCode;
            await partner.save();
        }

        // Get all orders referred by this partner
        const referredOrders = await Order.find({ referredBy: partnerId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // Get commission records
        const commissions = await Commission.find({ partner: partnerId })
            .populate('order')
            .sort({ createdAt: -1 });

        // Calculate stats
        const stats = {
            totalReferrals: referredOrders.length,
            totalOrders: referredOrders.length,
            totalEarnings: partner.totalEarnings || 0,
            pendingCommission: partner.pendingCommission || 0,
            paidCommission: partner.paidCommission || 0,
            commissionRate: partner.commissionRate || 0
        };

        res.json({
            partner: {
                name: partner.name,
                email: partner.email,
                referralCode: partner.referralCode,
                phone: partner.phone
            },
            stats,
            referredOrders,
            commissions
        });
    } catch (error) {
        console.error("Partner Dashboard Error:", error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Get Partner Referral Link
// @route   GET /api/partners/referral-link
// @access  Private (Partner only)
const getReferralLink = async (req, res) => {
    try {
        const partner = await User.findById(req.user.id);

        if (!partner) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!partner.isPartner) {
            return res.status(403).json({ msg: 'Not authorized as partner' });
        }

        // Auto-generate referral code if missing
        if (!partner.referralCode) {
            const referralCode = await generateUniqueReferralCode(partner.name);
            partner.referralCode = referralCode;
            await partner.save();
        }

        const baseUrl = process.env.CLIENT_URL || 'https://naturebridge.store';
        const referralLink = `${baseUrl}?ref=${partner.referralCode}`;

        res.json({
            referralCode: partner.referralCode,
            referralLink,
            commissionRate: partner.commissionRate || 0
        });
    } catch (error) {
        console.error("Referral Link Error:", error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

module.exports = {
    registerPartner,
    getPartnerDashboard,
    getReferralLink
};
