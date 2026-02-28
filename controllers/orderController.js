const Order = require('../models/Order');
const User = require('../models/User');
const Commission = require('../models/Commission');
const PDFDocument = require('pdfkit');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.addOrderItems = async (req, res) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        referralCode // Optional: referral code from partner
    } = req.body;

    if (orderItems && orderItems.length === 0) {
        return res.status(400).json({ msg: 'No order items' });
    } else {
        const orderData = {
            orderItems,
            user: req.user.id,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice
        };

        // Check if referral code is provided and valid
        if (referralCode) {
            const partner = await User.findOne({ referralCode, isPartner: true });
            if (partner) {
                orderData.referredBy = partner._id;
                orderData.referralCode = referralCode;
            }
        }

        // Fallback: if no referral code sent, check if the user was originally referred by a partner
        if (!orderData.referredBy) {
            const orderingUser = await User.findById(req.user.id);
            if (orderingUser && orderingUser.referredBy) {
                orderData.referredBy = orderingUser.referredBy;
            }
        }

        const order = new Order(orderData);
        const createdOrder = await order.save();

        // Process digital content purchases (e-books and courses)
        const currentUser = await User.findById(req.user.id);
        let hasDigitalContent = false;

        for (const item of orderItems) {
            if (item.itemType === 'ebook' && item.ebook) {
                // Add e-book to user's purchased list if not already there
                if (!currentUser.purchasedEbooks.includes(item.ebook)) {
                    currentUser.purchasedEbooks.push(item.ebook);
                    hasDigitalContent = true;
                }
            } else if (item.itemType === 'course' && item.course) {
                // Add course to user's purchased list if not already there
                if (!currentUser.purchasedCourses.includes(item.course)) {
                    currentUser.purchasedCourses.push(item.course);
                    hasDigitalContent = true;
                }
            }
        }

        // Save user if digital content was added
        if (hasDigitalContent) {
            await currentUser.save();
        }

        if (createdOrder.referredBy) {
            const partner = await User.findById(createdOrder.referredBy);

            if (partner && partner.commissionRate > 0) {
                const commissionAmount = (totalPrice * partner.commissionRate) / 100;

                // Create commission record
                await Commission.create({
                    partner: partner._id,
                    order: createdOrder._id,
                    orderAmount: totalPrice,
                    commissionRate: partner.commissionRate,
                    commissionAmount,
                    status: 'pending'
                });

                // Update partner's pending commission
                partner.pendingCommission += commissionAmount;
                partner.totalEarnings += commissionAmount;
                await partner.save();

                // Mark commission as generated
                createdOrder.commissionGenerated = true;
                await createdOrder.save();
            }
        }

        // Notify Admins
        const Notification = require('../models/Notification');
        const admins = await User.find({ role: 'admin' });

        const notifications = admins.map(admin => ({
            recipient: admin._id,
            type: 'order',
            title: 'New Order Placed',
            message: `Order #${createdOrder._id.toString().slice(-6)} placed by ${req.user.name || 'User'}`,
            relatedId: createdOrder._id
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }



        res.status(201).json(createdOrder);
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (order) {
        if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        res.json(order);
    } else {
        res.status(404).json({ msg: 'Order not found' });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = async (req, res) => {
    const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
    res.json(orders);
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
        order.status = status;
        if (status === 'Delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }
        if (status === 'Shipped') {
            // Logic for shipped timestamp if needed
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ msg: 'Order not found' });
    }
};

// @desc    Update order to delivered (Legacy/Specific)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.status = 'Delivered';

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ msg: 'Order not found' });
    }
};

// @desc    Get Order Invoice PDF
// @route   GET /api/orders/:id/invoice
// @access  Private
exports.getOrderInvoice = async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
        return res.status(404).json({ msg: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ msg: 'Not authorized' });
    }

    const doc = new PDFDocument({ margin: 50 });

    const filename = `invoice-${order._id}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Nature E-Commerce Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice Number: ${order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Status: ${order.isPaid ? 'Paid' : 'Unpaid'}`);
    doc.moveDown();

    // Customer Info
    doc.text(`Bill To: ${order.user.name}`);
    doc.text(`Address: ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`);
    doc.moveDown();

    // Table Header
    doc.text('Item', 50, 250);
    doc.text('Quantity', 300, 250);
    doc.text('Price', 400, 250, { align: 'right' });
    doc.moveTo(50, 265).lineTo(550, 265).stroke();

    // Items
    let y = 280;
    order.orderItems.forEach(item => {
        doc.text(item.name, 50, y);
        doc.text(item.qty.toString(), 300, y);
        doc.text(item.price.toFixed(2), 400, y, { align: 'right' });
        y += 20;
    });

    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

    // Total
    doc.fontSize(14).text(`Total: ${order.totalPrice.toFixed(2)}`, 350, y + 30, { align: 'right' });

    doc.end();
};
