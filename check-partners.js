const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const checkPartners = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const partners = await User.find({ role: 'partner' });
        console.log(`Found ${partners.length} partners:`);
        partners.forEach(p => {
            console.log(`- ${p.name} (${p.email}) ID: ${p._id}, isPartner: ${p.isPartner}, ReferralCode: ${p.referralCode}`);
        });

        // Also check all users to see if any are intended to be partners
        const allUsers = await User.find({});
        console.log(`Total Users: ${allUsers.length}`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkPartners();
