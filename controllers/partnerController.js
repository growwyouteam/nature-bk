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

        // Send Welcome Email
        try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            await resend.emails.send({
                from: `Nature Store <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
                to: [partner.email],
                subject: `Welcome to Nature E-Commerce Partner Program, ${partner.name}!`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: left;">
                        <h2 style="color: #2e7d32;">Welcome to Nature, ${partner.name}!</h2>
                        <p>Your Partner profile has been successfully created. Start referring and earning!</p>
                        <div style="background-color: #f7f9f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2e7d32;">Your Login Credentials</h3>
                            <p style="margin: 5px 0;"><strong>Email ID:</strong> ${partner.email}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                            <p style="margin: 5px 0;"><strong>Referral Code:</strong> <span style="background-color: #e8f5e9; padding: 2px 5px; border-radius: 4px;">${referralCode}</span></p>
                        </div>
                        <p style="font-size: 14px;">Please keep these credentials safe. You can log in at any time to check your Dashboard, Referral Code, and Earnings.</p>
                        <br/>
                        <p style="color: #777; font-size: 12px;">This is an automated message from Nature E-Commerce.</p>
                    </div>
                `
            });
            console.log('Partner Welcome email sent successfully to:', partner.email);
        } catch (emailErr) {
            console.log("Partner welcome email failed: ", emailErr.message);
        }

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

        // Get all users referred by this partner
        const referredUsers = await User.find({ referredBy: partnerId })
            .select('name email createdAt')
            .sort({ createdAt: -1 });

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
            totalReferrals: referredUsers.length,
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
            referredUsers,
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
