const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20); // Limit to last 20 notifications

        const unreadCount = await Notification.countDocuments({
            recipient: req.user.id,
            read: false
        });

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        // Check user ownership
        if (notification.recipient.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        notification.read = true;
        await notification.save();

        res.json(notification);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.json({ msg: 'All notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        // Check user ownership
        if (notification.recipient.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await notification.deleteOne();

        res.json({ msg: 'Notification removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
