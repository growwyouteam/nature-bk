const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');

        const adminEmail = 'admin@example.com';
        const adminPassword = 'admin123'; // Hardcoded initial password
        const adminName = 'Super Admin';

        // Check if admin exists
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            // Update existing admin
            admin.password = adminPassword; // Pre-save hook will hash this
            admin.role = 'admin';
            await admin.save();
            console.log('Admin Password Updated Successfully');
        } else {
            // Create new admin
            admin = new User({
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                role: 'admin'
            });
            await admin.save();
            console.log('Admin Account Created Successfully');
        }

        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
