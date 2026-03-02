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
        // Generate a short 4-digit Order ID (e.g. OD3555)
        const generateOrderId = () => {
            const randomNum = Math.floor(Math.random() * 9000) + 1000; // 4 digit random number
            return `OD${randomNum}`;
        };

        let uniqueOrderId = generateOrderId();
        let isUnique = false;

        // Ensure uniqueness
        while (!isUnique) {
            const existingOrder = await Order.findOne({ orderId: uniqueOrderId });
            if (!existingOrder) {
                isUnique = true;
            } else {
                uniqueOrderId = generateOrderId();
            }
        }

        const orderData = {
            orderId: uniqueOrderId,
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

// @desc    Get order by ID or orderId
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    // Check if the id is a standard MongoDB ObjectId or our custom orderId (OD...)
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: req.params.id } : { orderId: req.params.id };

    const order = await Order.findOne(query).populate('user', 'name email');

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
    try {
        const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
        const query = isObjectId ? { _id: req.params.id } : { orderId: req.params.id };
        const order = await Order.findOne(query).populate('user', 'name email');

        if (!order) return res.status(404).json({ msg: 'Order not found' });
        if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(401).json({ msg: 'Not authorized' });

        const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
        const displayOrderId = order.orderId || order._id.toString();
        const filename = `invoice-${displayOrderId}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        const W = 595;
        const M = 45;
        const CW = W - M * 2;
        const cur = (v) => `Rs. ${parseFloat(v || 0).toFixed(2)}`;

        // ── HEADER ─────────────────────────────────────────────
        doc.rect(0, 0, W, 80).fill('#1a3c2e');

        doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff')
            .text('NATURE WAY OF LIFE', M, 18, { lineBreak: false });
        doc.font('Helvetica').fontSize(9).fillColor('#b0d9bc')
            .text('naturebridge.store', M, 44, { lineBreak: false });

        // "INVOICE" — wide enough to avoid wrapping
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff')
            .text('INVOICE', W - M - 110, 26, { width: 110, align: 'right', lineBreak: false });

        // ── META SECTION ───────────────────────────────────────
        const metaY = 100;
        const midX = M + CW / 2 + 10;
        const lineH = 14;

        // Left column — Order Info
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1a3c2e')
            .text('ORDER INFORMATION', M, metaY);

        const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        doc.font('Helvetica').fontSize(9).fillColor('#333333')
            .text(`Order ID    : ${displayOrderId}`, M, metaY + lineH * 1)
            .text(`Date        : ${orderDate}`, M, metaY + lineH * 2)
            .text(`Payment     : ${order.paymentMethod}`, M, metaY + lineH * 3)
            .text(`Status      : ${order.isPaid ? 'Paid' : 'Pending'}`, M, metaY + lineH * 4);

        // Right column — Bill To
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1a3c2e')
            .text('BILL TO', midX, metaY);

        doc.font('Helvetica').fontSize(9).fillColor('#333333')
            .text(order.user.name, midX, metaY + lineH * 1, { width: CW / 2 - 10 })
            .text(order.user.email || '', midX, metaY + lineH * 2, { width: CW / 2 - 10 })
            .text(order.shippingAddress.address || '', midX, metaY + lineH * 3, { width: CW / 2 - 10 })
            .text(`${order.shippingAddress.city} - ${order.shippingAddress.postalCode}`, midX, metaY + lineH * 4, { width: CW / 2 - 10 });

        // ── DIVIDER ────────────────────────────────────────────
        const divY = metaY + lineH * 6;
        doc.moveTo(M, divY).lineTo(W - M, divY).lineWidth(0.5).strokeColor('#cccccc').stroke();

        // ── TABLE HEADER ───────────────────────────────────────
        const tY = divY + 8;
        const ROW_H = 22;

        const C = {
            item: { x: M, w: 215 },
            pack: { x: M + 218, w: 75 },
            qty: { x: M + 296, w: 35 },
            price: { x: M + 334, w: 75 },
            total: { x: M + 412, w: 83 },
        };

        doc.rect(M, tY, CW, 20).fill('#1a3c2e');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        doc.text('ITEM', C.item.x + 4, tY + 5, { width: C.item.w, lineBreak: false });
        doc.text('PACK', C.pack.x + 4, tY + 5, { width: C.pack.w, lineBreak: false });
        doc.text('QTY', C.qty.x + 4, tY + 5, { width: C.qty.w, align: 'center', lineBreak: false });
        doc.text('PRICE', C.price.x + 4, tY + 5, { width: C.price.w, align: 'right', lineBreak: false });
        doc.text('TOTAL', C.total.x + 4, tY + 5, { width: C.total.w, align: 'right', lineBreak: false });

        // ── TABLE ROWS ─────────────────────────────────────────
        let ry = tY + 22;
        order.orderItems.forEach((item, idx) => {
            doc.rect(M, ry - 2, CW, ROW_H).fill(idx % 2 === 0 ? '#f8f8f8' : '#ffffff');

            const maxLen = 35;
            const name = item.name.length > maxLen ? item.name.substring(0, maxLen) + '...' : item.name;
            const lineTotal = (item.price * item.qty).toFixed(2);

            doc.font('Helvetica').fontSize(8.5).fillColor('#333333');
            doc.text(name, C.item.x + 4, ry + 3, { width: C.item.w - 4, lineBreak: false });
            doc.text(item.pack || '-', C.pack.x + 4, ry + 3, { width: C.pack.w - 4, lineBreak: false });
            doc.text(String(item.qty), C.qty.x + 4, ry + 3, { width: C.qty.w - 4, align: 'center', lineBreak: false });
            doc.text(cur(item.price), C.price.x + 4, ry + 3, { width: C.price.w - 4, align: 'right', lineBreak: false });
            doc.font('Helvetica-Bold').fillColor('#1a3c2e')
                .text(cur(lineTotal), C.total.x + 4, ry + 3, { width: C.total.w - 4, align: 'right', lineBreak: false });

            ry += ROW_H;
        });

        // ── TOTALS ─────────────────────────────────────────────
        doc.moveTo(M, ry + 4).lineTo(W - M, ry + 4).lineWidth(0.5).strokeColor('#cccccc').stroke();

        let ty2 = ry + 16;
        const tLX = W - M - 160;
        const tVX = W - M - 5;
        const addRow = (lbl, val, bold) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9)
                .fillColor('#444444').text(lbl, tLX, ty2, { lineBreak: false });
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? '#1a3c2e' : '#444444')
                .text(val, tLX, ty2, { width: tVX - tLX, align: 'right', lineBreak: false });
            ty2 += bold ? 22 : 17;
        };

        addRow('Subtotal:', cur(order.itemsPrice || order.totalPrice));
        addRow('Shipping:', cur(order.shippingPrice || 0));
        if ((order.discountPrice || 0) > 0) addRow('Discount:', `- ${cur(order.discountPrice)}`);
        doc.moveTo(tLX, ty2 - 4).lineTo(W - M, ty2 - 4).lineWidth(0.8).strokeColor('#999999').stroke();
        addRow('GRAND TOTAL:', cur(order.totalPrice), true);

        // ── FOOTER ─────────────────────────────────────────────
        doc.rect(0, 802, W, 40).fill('#f0f0f0');
        doc.font('Helvetica').fontSize(8).fillColor('#888888')
            .text('Thank you for shopping with Nature Way of Life!', M, 811, { align: 'center', width: CW })
            .text('Support: support@naturebridge.store', M, 824, { align: 'center', width: CW });

        doc.end();
    } catch (err) {
        console.error('Invoice generation error:', err);
        if (!res.headersSent) res.status(500).json({ msg: 'Failed to generate invoice' });
    }
};

