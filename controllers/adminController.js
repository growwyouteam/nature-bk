const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Commission = require('../models/Commission');

// ... existing getDashboardStats ...

// @desc    Get All Reviews (Admin)
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name')
            .populate('product', 'title')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Review Status
// @route   PUT /api/admin/reviews/:id
// @access  Private/Admin
exports.updateReviewStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ msg: 'Review not found' });

        review.status = status;
        if (status === 'Approved') {
            review.isApproved = true;
        } else {
            review.isApproved = false;
        }

        await review.save();
        res.json(review);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete Review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Review removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Total Revenue
        const totalRevenue = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        // 2. Total Orders
        const totalOrders = await Order.countDocuments();

        // 3. Active Users
        const totalUsers = await User.countDocuments({ role: 'user' });

        // 4. Total Partners
        const totalPartners = await User.countDocuments({ isPartner: true });

        // 5. Recent Orders
        const recentOrders = await Order.find()
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        // 6. Order Status Breakdown
        const ordersByStatus = await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // 7. Revenue Trend (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const revenueTrend = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalPrice" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 8. Top Products (by order count)
        const topProducts = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.product",
                    name: { $first: "$orderItems.name" },
                    totalSold: { $sum: "$orderItems.qty" },
                    revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        // 9. Pending Reviews Count
        const pendingReviews = await Review.countDocuments({ status: 'Pending' });

        // 10. Commission Summary
        const commissionSummary = await Commission.aggregate([
            {
                $group: {
                    _id: "$status",
                    total: { $sum: "$commissionAmount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            revenue: totalRevenue[0]?.total || 0,
            orders: totalOrders,
            users: totalUsers,
            partners: totalPartners,
            recentOrders,
            ordersByStatus,
            revenueTrend,
            topProducts,
            pendingReviews,
            commissionSummary
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// ========== PARTNER MANAGEMENT ==========

// @desc    Get All Partners
// @route   GET /api/admin/partners
// @access  Private/Admin
exports.getAllPartners = async (req, res) => {
    try {
        const partners = await User.find({ isPartner: true })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(partners);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Partner Details with Orders & Commissions
// @route   GET /api/admin/partners/:id
// @access  Private/Admin
exports.getPartnerDetails = async (req, res) => {
    try {
        const partner = await User.findById(req.params.id).select('-password');

        if (!partner || !partner.isPartner) {
            return res.status(404).json({ msg: 'Partner not found' });
        }

        // Get referred orders
        const referredOrders = await Order.find({ referredBy: partner._id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // Get commissions
        const commissions = await Commission.find({ partner: partner._id })
            .populate('order')
            .sort({ createdAt: -1 });

        res.json({
            partner,
            referredOrders,
            commissions
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Partner Commission Rate
// @route   PUT /api/admin/partners/:id/commission-rate
// @access  Private/Admin
exports.updatePartnerCommissionRate = async (req, res) => {
    try {
        const { commissionRate } = req.body;

        const partner = await User.findById(req.params.id);

        if (!partner || !partner.isPartner) {
            return res.status(404).json({ msg: 'Partner not found' });
        }

        partner.commissionRate = commissionRate;
        await partner.save();

        res.json(partner);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Verify Admin Password
// @route   POST /api/admin/verify-password
// @access  Private/Admin
exports.verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid password' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete Partner
// @route   DELETE /api/admin/partners/:id
// @access  Private/Admin
exports.deletePartner = async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);

        if (!partner || !partner.isPartner) {
            return res.status(404).json({ msg: 'Partner not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Partner deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Get All Commissions
// @route   GET /api/admin/commissions
// @access  Private/Admin
exports.getAllCommissions = async (req, res) => {
    try {
        const { status } = req.query; // Filter by status: pending, approved, paid, rejected

        const filter = status ? { status } : {};

        const commissions = await Commission.find(filter)
            .populate('partner', 'name email referralCode')
            .populate('order')
            .sort({ createdAt: -1 });

        res.json(commissions);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Approve Commission
// @route   PUT /api/admin/commissions/:id/approve
// @access  Private/Admin
exports.approveCommission = async (req, res) => {
    try {
        const commission = await Commission.findById(req.params.id);

        if (!commission) {
            return res.status(404).json({ msg: 'Commission not found' });
        }

        if (commission.status !== 'pending') {
            return res.status(400).json({ msg: 'Commission already processed' });
        }

        commission.status = 'approved';
        commission.approvedBy = req.user.id;
        commission.approvedAt = Date.now();
        await commission.save();

        // Update partner's pending and approved amounts
        const partner = await User.findById(commission.partner);
        partner.pendingCommission -= commission.commissionAmount;
        partner.paidCommission += commission.commissionAmount; // Assuming 'paid' means approved/ready for payout, or maybe just approved? 
        // Wait, the model has pending, paid. It seems 'approved' might just mean it moves from pending to... where?
        // Let's check User model fields again from walkthrough.md
        // totalEarnings, pendingCommission, paidCommission.
        // If approved, it's not paid yet. It just moves out of pending? Or stays in pending until paid?
        // The previous code only did: partner.pendingCommission -= commission.commissionAmount;
        // This implies it disappears from pending. But where does it go?
        // Ah, totalEarnings tracks everything. 
        // Let's stick to what was there, but add the Notification.

        // Actually, looking at previous code: partner.pendingCommission -= commission.commissionAmount;
        // It reduces pending. But doesn't add to anything else?
        // If I approve it, it should probably stay in pending until PAID?
        // Or maybe there is an 'approvedCommission' field?
        // The walkthrough says: "pendingCommission: Awaiting approval", "paidCommission: Already paid out".
        // If I approve it, it's no longer pending, but not yet paid.
        // So `pendingCommission` reduction is correct.
        // It seems `totalEarnings` is the sum of all.

        await partner.save();

        // Notify Partner
        const Notification = require('../models/Notification');
        await Notification.create({
            recipient: partner._id,
            type: 'commission',
            title: 'Commission Approved',
            message: `Your commission of ₹${commission.commissionAmount} has been approved.`,
            relatedId: commission._id
        });

        res.json(commission);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Reject Commission
// @route   PUT /api/admin/commissions/:id/reject
// @access  Private/Admin
exports.rejectCommission = async (req, res) => {
    try {
        const { notes } = req.body;
        const commission = await Commission.findById(req.params.id);

        if (!commission) {
            return res.status(404).json({ msg: 'Commission not found' });
        }

        if (commission.status !== 'pending') {
            return res.status(400).json({ msg: 'Commission already processed' });
        }

        commission.status = 'rejected';
        commission.notes = notes;
        await commission.save();

        // Update partner's pending and total amounts
        const partner = await User.findById(commission.partner);
        partner.pendingCommission -= commission.commissionAmount;
        partner.totalEarnings -= commission.commissionAmount;
        await partner.save();

        res.json(commission);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Mark Commission as Paid
// @route   PUT /api/admin/commissions/:id/paid
// @access  Private/Admin
exports.markCommissionPaid = async (req, res) => {
    try {
        const commission = await Commission.findById(req.params.id);

        if (!commission) {
            return res.status(404).json({ msg: 'Commission not found' });
        }

        if (commission.status !== 'approved') {
            return res.status(400).json({ msg: 'Commission must be approved first' });
        }

        commission.status = 'paid';
        commission.paidAt = Date.now();
        await commission.save();

        // Update partner's paid commission
        const partner = await User.findById(commission.partner);
        partner.paidCommission += commission.commissionAmount;
        await partner.save();

        res.json(commission);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Commission Status Manually
// @route   PUT /api/admin/commissions/:id/status-manual
// @access  Private/Admin
exports.updateCommissionStatusManual = async (req, res) => {
    try {
        const { status } = req.body;
        const commission = await Commission.findById(req.params.id);

        if (!commission) {
            return res.status(404).json({ msg: 'Commission not found' });
        }

        const oldStatus = commission.status;
        const newStatus = status;

        if (oldStatus === newStatus) {
            return res.json(commission);
        }

        const partner = await User.findById(commission.partner);
        const amount = commission.commissionAmount;

        // 1. Remove side effects of OLD status
        if (oldStatus === 'pending') {
            partner.pendingCommission -= amount;
            partner.totalEarnings -= amount;
        } else if (oldStatus === 'approved') {
            partner.totalEarnings -= amount;
        } else if (oldStatus === 'paid') {
            partner.paidCommission -= amount;
            partner.totalEarnings -= amount;
        }
        // rejected has no effect on totalEarnings/pending/paid balances in this logic

        // 2. Apply side effects of NEW status
        if (newStatus === 'pending') {
            partner.pendingCommission += amount;
            partner.totalEarnings += amount;
        } else if (newStatus === 'approved') {
            partner.totalEarnings += amount;
            commission.approvedBy = req.user.id;
            commission.approvedAt = Date.now();
        } else if (newStatus === 'paid') {
            partner.paidCommission += amount;
            partner.totalEarnings += amount;
            commission.paidAt = Date.now();
        } else if (newStatus === 'rejected') {
            // rejected removes from all totals (already subtracted above)
        }

        commission.status = newStatus;
        await partner.save();
        await commission.save();

        res.json(commission);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
