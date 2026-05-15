const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Database Connection
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            family: 4, // Force IPv4 to avoid DNS/IPv6 resolution issues
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};

// Connect for local development
if (process.env.NODE_ENV !== 'production') {
    connectDB();
}

// Middleware to ensure DB connection for every request in production/serverless
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/ebooks', require('./routes/ebooks'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/upload-pdf', require('./routes/uploadPdf'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/pincodes', require('./routes/pincodes'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/franchise', require('./routes/franchise'));

// Health Check
app.get('/', (req, res) => {
    res.send('Nature E-Commerce API is running');
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
