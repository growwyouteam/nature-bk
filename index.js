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
    origin: '*', // Allow all origins for debugging
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/ebooks', require('./routes/ebooks'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/payment', require('./routes/paymentRoutes')); // Payment Routes
app.use('/api/pincodes', require('./routes/pincodes'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/notifications', require('./routes/notifications'));

// Basic Route
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
