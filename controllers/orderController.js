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
        discountPrice, // Added discountPrice
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
            discountPrice, // Store discountPrice
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
            message: `Order #${createdOrder.orderId} placed by ${req.user.name || 'User'}`,
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
            const subtotalExclGst = Number(itemsPrice);
            const gstPercentLabel = orderItems.length > 0 && orderItems[0].gstPercent ? `(${orderItems[0].gstPercent}%)` : '';

            const htmlTemplate = `
            <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e1e1e1; overflow: hidden;">
                    
                    <!-- Header Banner -->
                    <div style="background-color: #1E4620; padding: 30px; text-align: center; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">NatureBridge</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Order Successfully Placed</p>
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 14px;">
                            <span style="display: block; margin-bottom: 5px;"><b>Customer:</b> ${currentUser.name || 'Valued Customer'}</span>
                            <span><b>Mobile:</b> ${currentUser.phone || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div style="padding: 40px;">
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Hi there,<br><br>
                            Thank you for shopping with NatureBridge! Your order <b>${createdOrder.orderId}</b> is currently being processed. Here is a summary of your recent purchase:
                        </p>

                        <!-- Items Table -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                            <thead>
                                <tr>
                                    <th align="left" style="padding-bottom: 12px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #888888; text-transform: uppercase;">Item</th>
                                    <th align="right" style="padding-bottom: 12px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #888888; text-transform: uppercase;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItems.map(item => `
                                <tr>
                                    <td style="padding: 16px 0; border-bottom: 1px solid #f9f9f9;">
                                        <div style="font-weight: 600; font-size: 15px;">${item.name}</div>
                                        <div style="color: #888888; font-size: 13px; margin-top: 4px;">Qty: ${item.qty}</div>
                                    </td>
                                    <td align="right" style="padding: 16px 0; border-bottom: 1px solid #f9f9f9; font-weight: 600; font-size: 15px;">
                                        ₹${Number(item.price).toFixed(2)}
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <!-- Totals Wrapper -->
                        <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; border: 1px solid #f0f0f0; margin-bottom: 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-bottom: 8px; font-size: 14px; color: #666666;">Subtotal (Excl. GST):</td>
                                    <td align="right" style="padding-bottom: 8px; font-size: 14px; font-weight: 600;">₹${Number(itemsPrice).toFixed(2)}</td>
                                </tr>
                                ${discountPrice > 0 ? `
                                <tr>
                                    <td style="padding-bottom: 8px; font-size: 14px; color: #1E4620;">Discount (Coupon):</td>
                                    <td align="right" style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #1E4620;">- ₹${Number(discountPrice).toFixed(2)}</td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td style="padding-bottom: 8px; font-size: 14px; color: #666666;">GST ${gstPercentLabel}:</td>
                                    <td align="right" style="padding-bottom: 8px; font-size: 14px; font-weight: 600;">₹${Number(taxPrice).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style="padding-bottom: 12px; font-size: 14px; color: #666666;">Shipping:</td>
                                    <td align="right" style="padding-bottom: 12px; font-size: 14px; font-weight: 600;">₹${Number(shippingPrice).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 18px; font-weight: 800; color: #1E4620;">Payable Amount:</td>
                                    <td align="right" style="padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 18px; font-weight: 800; color: #1E4620;">₹${Number(totalPrice).toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Shipping Section -->
                        <div style="border-top: 1px solid #eeeeee; padding-top: 25px;">
                            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 700;">Shipping Details</h3>
                            <div style="font-size: 14px; line-height: 1.6; color: #666666;">
                                ${shippingAddress.address}<br>
                                ${shippingAddress.city} - ${shippingAddress.postalCode}<br>
                                ${shippingAddress.country || 'India'}<br>
                                <span style="display: inline-block; margin-top: 8px;">
                                    <b>Payment Method:</b> ${paymentMethod}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #fcfcfc; padding: 25px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
                            © ${new Date().getFullYear()} Nature E-Commerce. All rights reserved.
                        </p>
                        <p style="margin-top: 5px; font-size: 11px; color: #cccccc;">
                            This is an automated email. Please do not reply directly to this message.
                        </p>
                    </div>
                </div>
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
    try {
        // Check if the id is a standard MongoDB ObjectId or our custom orderId (OD...)
        const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
        const query = isObjectId ? { _id: req.params.id } : { orderId: req.params.id };

        const order = await Order.findOne(query).populate('user', 'name email phone');

        if (!order) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        // Check admin — from JWT role (new tokens) OR from DB (old tokens)
        let isAdmin = req.user.role === 'admin';
        if (!isAdmin) {
            const requestingUser = await User.findById(req.user.id).select('role');
            isAdmin = requestingUser?.role === 'admin';
        }

        const isOwner = order.user && order.user._id.toString() === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error in getOrderById:', error);
        res.status(500).json({ msg: 'Server error' });
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
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');

    if (!order) {
        return res.status(404).json({ msg: 'Order not found' });
    }

    // Check admin — from JWT role (new tokens) OR from DB (old tokens)
    let isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
        const requestingUser = await User.findById(req.user.id).select('role');
        isAdmin = requestingUser?.role === 'admin';
    }

    const isOwner = order.user && order.user._id.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
        return res.status(401).json({ msg: 'Not authorized' });
    }

    const doc = new PDFDocument({ margin: 50 });

    const filename = `invoice-${order._id}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('NatureBridge Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice Number: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Status: ${order.isPaid ? 'Paid' : 'Unpaid'}`);
    doc.moveDown();

    // Customer Info
    doc.text(`Bill To: ${order.user.name}`);
    doc.text(`Address: ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`);
    doc.moveDown();

    // Table Header
    doc.text('Item', 50, 250);
    doc.text('Qty', 260, 250);
    doc.text('GST %', 310, 250);
    doc.text('Base Price', 380, 250);
    doc.text('Total (Inc. GST)', 450, 250);
    doc.moveTo(50, 265).lineTo(550, 265).stroke();

    // Items
    let y = 280;
    let sumBasePrice = 0;
    order.orderItems.forEach(item => {
        const gstPrcnt = item.gstPercent || 0;
        const basePrice = item.price;
        const gstAmountPerItem = basePrice * (gstPrcnt / 100);
        const inclusivePrice = basePrice + gstAmountPerItem;
        const totalInc = inclusivePrice * item.qty;
        const totalBase = basePrice * item.qty;
        sumBasePrice += totalBase;

        doc.text(item.name, 50, y, { width: 200 });
        doc.text(item.qty.toString(), 260, y);
        doc.text(`${gstPrcnt}%`, 310, y);
        doc.text(`Rs. ${basePrice.toFixed(2)}`, 380, y);
        doc.text(`Rs. ${totalInc.toFixed(2)}`, 450, y);
        y += 40;
    });

    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

    // Total
    const taxPrice = order.taxPrice || (order.totalPrice - sumBasePrice);
    doc.fontSize(12).text(`Subtotal (Excl. GST): Rs. ${sumBasePrice.toFixed(2)}`, 320, y + 30);
    doc.text(`Total GST: Rs. ${taxPrice.toFixed(2)}`, 320, y + 50);
    doc.fontSize(14).text(`Grand Total: Rs. ${order.totalPrice.toFixed(2)}`, 320, y + 80);

    doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'Failed to generate invoice' });
        }
    }
};
