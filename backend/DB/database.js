// backend/DB/database.js
import mongoose from 'mongoose';

const db = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not set in environment variables');
    throw new Error('MONGO_URI missing');
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB || 'TimeTable', // optional: set DB name via env
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    throw error;
  }
};

export default db;
