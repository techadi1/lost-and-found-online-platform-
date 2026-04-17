import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Item from './models/Item.js';
import User from './models/User.js';

dotenv.config({ path: './.env' });

const mockItems = [
  {
    title: 'Black Leather Wallet',
    status: 'Lost',
    description: 'Lost my black leather bifold wallet containing ID, credit cards, and some cash. Has a small tear on the back corner.',
    category: 'Bags',
    location: 'Central Park, near Bethesda Fountain',
    date: new Date('2026-02-20'),
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=250&auto=format&fit=crop',
    contactInfo: 'lost@example.com'
  },
  {
    title: 'Wireless Headphones',
    status: 'Found',
    description: 'Found a pair of black Sony wireless headphones on a bench. They appear to be in good condition and were still in their case.',
    category: 'Electronics',
    location: 'Brooklyn Bridge Park',
    date: new Date('2026-02-22'),
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=250&auto=format&fit=crop',
    contactInfo: 'found@example.com'
  },
  {
    title: 'Car Keys with Red Keychain',
    status: 'Lost',
    description: 'Lost my Honda car keys attached to a red fabric keychain. Has a library card keyring and a small flashlight attached.',
    category: 'Keys',
    location: 'Times Square subway station',
    date: new Date('2026-02-23'),
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=250&auto=format&fit=crop',
    contactInfo: 'lost-keys@example.com'
  },
  {
    title: 'Blue Backpack',
    status: 'Found',
    description: 'Found a blue JanSport backpack at the coffee shop. Contains a laptop, notebook, and some personal items.',
    category: 'Bags',
    location: 'Blue Bottle Coffee, West Village',
    date: new Date('2026-02-23'),
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=250&auto=format&fit=crop',
    contactInfo: 'coffee-shop@example.com'
  },
  {
    title: 'iPhone 13 Pro',
    status: 'Lost',
    description: 'Lost my silver iPhone 13 Pro with a clear case. Has a small crack on the bottom right corner of the screen.',
    category: 'Electronics',
    location: 'Grand Central Terminal',
    date: new Date('2026-02-21'),
    imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=250&auto=format&fit=crop',
    contactInfo: 'myphone@example.com'
  },
  {
    title: 'Gold Necklace',
    status: 'Found',
    description: 'Found a delicate gold necklace with a small pendant in the shape of a heart. Found on the sidewalk outside the gym.',
    category: 'Jewelry',
    location: 'Equinox Gym, Upper East Side',
    date: new Date('2026-02-24'),
    imageUrl: 'https://images.unsplash.com/photo-1599643477873-1efaee4ca3fa?q=80&w=250&auto=format&fit=crop',
    contactInfo: 'gym-reception@example.com'
  }
];

const seedDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI is missing from .env');

    await mongoose.connect(MONGODB_URI, { autoSelectFamily: false });
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing data
    await Item.deleteMany({});
    console.log('🚮 Cleared old items');

    // Insert mock items
    await Item.insertMany(mockItems);
    console.log('🌱 Database seeded with mock items successfully!');

    // Clear existing users
    await User.deleteMany({});
    
    // Create an admin user
    await User.create({
      name: 'System Admin',
      email: 'admin@lostfound.com',
      password: 'adminpassword123', // In a real app, hash this!
      role: 'admin'
    });
    console.log('👤 Admin user created: admin@lostfound.com / adminpassword123');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
