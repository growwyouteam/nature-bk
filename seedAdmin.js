const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected');

        // Check if admin exists
        let adminUser = await User.findOne({ email: 'admin@nature.com' });

        if (adminUser) {
            console.log('Admin user found. Updating password...');
            adminUser.password = 'admin123'; // Reset password
            adminUser.role = 'admin'; // Ensure role is admin
            await adminUser.save();
            console.log('Admin Password Updated Successfully');
        } else {
            // Create Admin User
            adminUser = new User({
                name: 'Admin',
                email: 'admin@nature.com',
                password: 'admin123',
                role: 'admin',
                phone: '9999999999'
            });
            await adminUser.save();
            console.log('Admin User Created Successfully');
        }

        console.log('Email: admin@nature.com');
        console.log('Password: admin123');
        console.log('Email: admin@nature.com');
        console.log('Password: admin123');

        process.exit();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
