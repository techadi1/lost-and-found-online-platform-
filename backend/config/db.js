import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoSelectFamily: false
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('SSL routines') || error.message.includes('alert number 80')) {
      console.warn('⚠️ TIP: This could be an SSL/TLS issue. Check your Node version or try appending &tlsAllowInvalidCertificates=true to your MONGODB_URI in .env.');
    } else if (error.message.includes('querySrv ESERVFAIL')) {
      console.warn('⚠️ TIP: This often means your IP is not whitelisted in MongoDB Atlas or there are DNS issues.');
    }
    throw error;
  }
};

export default connectDB;
