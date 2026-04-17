import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
    try {
        console.log('🔍 Testing connection to:', process.env.MONGODB_URI);
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            autoSelectFamily: false
        });
        console.log('✅ SUCCESS! Connected to:', conn.connection.host);
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED TO CONNECT:', err.message);
        console.log('\nPotential solutions:');
        console.log('1. (Most likely) Your IP is NOT whitelisted in MongoDB Atlas Network Access.');
        console.log('2. Your database password in .env contains special characters that need encoding (like @ -> %40).');
        console.log('3. Your local firewall or company network is blocking port 27017.');
        process.exit(1);
    }
};

testConnection();
