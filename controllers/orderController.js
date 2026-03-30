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

        // Setup Resend and Send Confirmation Emails
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminEmail = 'sharmaji980780@gmail.com';

        try {
            const htmlTemplate = `
            <div style="background-color: #f7f9fa; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100vh;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                        <td bgcolor="#1E4620" style="padding: 30px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">NatureBridge</h2>
                            <p style="color: #a3c2a8; margin: 10px 0 0 0; font-size: 15px;">Order Successfully Placed</p>
                        </td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <p style="font-size: 16px; color: #333333; line-height: 1.5; margin: 0 0 20px 0;">
                                Hi there, <br><br>
                                Thank you for shopping with NatureBridge! Your order <strong>${createdOrder.orderId}</strong> is currently being processed. Here is a summary of your recent purchase:
                            </p>
                            
                            <!-- Items Table -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border-bottom: 2px solid #f0f0f0;">
                                <tr>
                                    <th align="left" style="padding-bottom: 15px; color: #666666; font-size: 13px; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid #eeeeee;">Item</th>
                                    <th align="right" style="padding-bottom: 15px; color: #666666; font-size: 13px; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid #eeeeee;">Price</th>
                                </tr>
                                ${orderItems.map(item => `
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #f9f9f9;">
                                        <div style="font-size: 15px; color: #111111; font-weight: 500;">${item.name}</div>
                                        <div style="font-size: 13px; color: #888888; margin-top: 4px;">Qty: ${item.qty}</div>
                                    </td>
                                    <td align="right" valign="top" style="padding: 15px 0; border-bottom: 1px solid #f9f9f9; font-size: 15px; color: #111111; font-weight: 500;">
                                        ₹${Number(item.price).toFixed(2)}
                                    </td>
                                </tr>
                                `).join('')}
                            </table>
                            
                            <!-- Totals Table -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #fcfcfc; border-radius: 8px; border: 1px solid #f0f0f0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding-bottom: 10px; color: #555555; font-size: 14px;">Items Price:</td>
                                                <td align="right" style="padding-bottom: 10px; color: #111111; font-size: 14px; font-weight: 500;">₹${Number(itemsPrice).toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-bottom: 10px; color: #555555; font-size: 14px;">Tax:</td>
                                                <td align="right" style="padding-bottom: 10px; color: #111111; font-size: 14px; font-weight: 500;">₹${Number(taxPrice).toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-bottom: 15px; color: #555555; font-size: 14px;">Shipping:</td>
                                                <td align="right" style="padding-bottom: 15px; color: #111111; font-size: 14px; font-weight: 500;">₹${Number(shippingPrice).toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 15px; border-top: 1px solid #e0e0e0; color: #1E4620; font-size: 18px; font-weight: 700;">Total Amount:</td>
                                                <td align="right" style="padding-top: 15px; border-top: 1px solid #e0e0e0; color: #1E4620; font-size: 18px; font-weight: 700;">₹${Number(totalPrice).toFixed(2)}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Shipping Details -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #eeeeee; padding-top: 25px;">
                                <tr>
                                    <td>
                                        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333333;">Shipping Details</h3>
                                        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                            ${shippingAddress.address}<br>
                                            ${shippingAddress.city} - ${shippingAddress.postalCode}<br>
                                            ${shippingAddress.country || 'India'}<br>
                                            <strong style="color: #333333;">Payment Method:</strong> ${paymentMethod}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td bgcolor="#f8f9fa" style="padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0; color: #999999; font-size: 13px;">
                                © ${new Date().getFullYear()} Nature E-Commerce. All rights reserved.
                            </p>
                            <p style="margin: 5px 0 0 0; color: #bbbbbb; font-size: 12px;">
                                This is an automated email. Please do not reply directly to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
            `;

            if (currentUser && currentUser.email) {
                await resend.emails.send({
                    from: `Nature Store <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
                    to: currentUser.email,
                    subject: `Order Confirmed - ${createdOrder.orderId}`,
                    html: htmlTemplate
                });
            }

            await resend.emails.send({
                from: `Nature Store <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
                to: adminEmail,
                subject: `New Order Alert - ${createdOrder.orderId}`,
                html: htmlTemplate
            });

        } catch (emailError) {
            console.error('Error sending order emails via Resend:', emailError);
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
