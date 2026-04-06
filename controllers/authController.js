const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
exports.registerUser = async (req, res) => {
    const { name, email, password, referralCode } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        let referrer = null;
        if (referralCode) {
            referrer = await User.findOne({ referralCode });
        }

        user = new User({
            name,
            email,
            password,
            referredBy: referrer ? referrer._id : null
        });

        // Password hashing is handled by pre('save') middleware in User model

        await user.save();

        // Send Welcome Email
        try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            const userType = user.role === 'admin' ? 'Admin' : (user.isPartner ? 'Partner' : 'Customer');
            
            await resend.emails.send({
                from: `Nature Store <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
                to: [user.email],
                subject: `Welcome to Nature E-Commerce, ${user.name}!`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333 text-align: left;">
                        <h2 style="color: #2e7d32;">Welcome to Nature, ${user.name}!</h2>
                        <p>Your ${userType} profile has been successfully created.</p>
                        <div style="background-color: #f7f9f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #2e7d32;">Your Login Credentials</h3>
                            <p style="margin: 5px 0;"><strong>Email ID:</strong> ${user.email}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                        </div>
                        <p style="font-size: 14px;">Please keep these credentials safe. You can log in at any time to explore our products and update your profile.</p>
                        <br/>
                        <p style="color: #777; font-size: 12px;">This is an automated message from Nature E-Commerce.</p>
                    </div>
                `
            });
        } catch (emailErr) {
            console.log("Welcome email failed: ", emailErr.message);
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isPartner: user.isPartner || false,
                        referralCode: user.referralCode || null
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Login User
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isPartner: user.isPartner || false,
                        referralCode: user.referralCode || null
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Validate Referral Code and get referrer name
exports.validateReferralCode = async (req, res) => {
    try {
        const { code } = req.params;
        const referrer = await User.findOne({ referralCode: code, isPartner: true });

        if (!referrer) {
            return res.status(404).json({ msg: 'Invalid referral code' });
        }

        res.json({
            name: referrer.name,
            code: referrer.referralCode
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
