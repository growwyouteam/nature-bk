const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const products = [
    {
        title: 'Organic Ashwagandha Root Powder',
        slug: 'organic-ashwagandha-root-powder',
        tagline: 'Stress Relief & Energy Booster',
        description: '<p>Pure, organic Ashwagandha root powder sourced from the foothills of the Himalayas. Known for its powerful adaptogenic properties.</p>',
        mrp: 599,
        sellingPrice: 399,
        stock: 100,
        images: [
            { url: 'https://res.cloudinary.com/demo/image/upload/v1689694460/cld-sample-5.jpg', type: 'product' }
        ],
        benefits: [
            { text: 'Reduces Stress & Anxiety' },
            { text: 'Boosts Energy Levels' }
        ],
        packs: [
            { name: 'Starter Pack', quantity: '100g', price: 399, mrp: 599, isDefault: true },
            { name: 'Value Pack', quantity: '250g', price: 899, mrp: 1299 }
        ]
    },
    {
        title: 'Triphala Juice',
        slug: 'triphala-juice',
        tagline: 'Digestive Health & Detox',
        description: '<p>A powerful blend of three fruits: Amla, Bibhitaki, and Haritaki. Promotes digestion and internal cleansing.</p>',
        mrp: 499,
        sellingPrice: 299,
        stock: 50,
        images: [
            { url: 'https://res.cloudinary.com/demo/image/upload/v1689694460/cld-sample-4.jpg', type: 'product' }
        ],
        benefits: [
            { text: 'Improves Digestion' },
            { text: 'Natural Detox' }
        ],
        packs: [
            { name: 'Bottle', quantity: '500ml', price: 299, mrp: 499, isDefault: true }
        ]
    },
    {
        title: 'Turmeric Latte Mix',
        slug: 'turmeric-latte-mix',
        tagline: 'Golden Milk for Immunity',
        description: '<p>Delicious blend of high-curcumin turmeric, black pepper, and spices. Perfect for boosting immunity.</p>',
        mrp: 399,
        sellingPrice: 249,
        stock: 75,
        images: [
            { url: 'https://res.cloudinary.com/demo/image/upload/v1689694460/cld-sample-3.jpg', type: 'product' }
        ],
        benefits: [
            { text: 'Boosts Immunity' },
            { text: 'Anti-inflammatory' }
        ],
        packs: [
            { name: 'Can', quantity: '150g', price: 249, mrp: 399, isDefault: true }
        ]
    }
];

const seedProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Clear existing products to avoid duplicates if re-running
        // await Product.deleteMany({}); 
        // console.log('Cleared existing products');

        for (const p of products) {
            const existing = await Product.findOne({ slug: p.slug });
            if (!existing) {
                await Product.create(p);
                console.log(`Created: ${p.title}`);
            } else {
                console.log(`Skipped (Exists): ${p.title}`);
            }
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedProducts();
