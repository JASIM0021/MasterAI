const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Credit = require('./models/Credit');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createTestUser = async () => {
  try {
    await connectDB();

    // Check if test user already exists
    let testUser = await User.findOne({ email: 'test@masterai.dev' });

    if (!testUser) {
      // Create test user
      testUser = new User({
        name: 'Test User',
        email: 'test@masterai.dev',
        googleId: 'test-google-id-12345',
        profilePicture: null,
        isActive: true
      });

      await testUser.save();
      console.log('✅ Test user created:', testUser._id);

      // Create initial credits for test user
      const testCredit = new Credit({
        userId: testUser._id,
        credits: 1000, // Give plenty of credits for testing
        type: 'test_credits',
        description: 'Test credits for video generation testing'
      });

      await testCredit.save();
      console.log('✅ Test credits added: 1000 credits');
    } else {
      console.log('✅ Test user already exists:', testUser._id);
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
    const token = jwt.sign({ userId: testUser._id }, JWT_SECRET, { expiresIn: '24h' });

    console.log('\n🔑 Test JWT Token:');
    console.log(token);
    console.log('\n📋 Use this in Authorization header:');
    console.log(`Bearer ${token}`);
    console.log('\n👤 Test User Info:');
    console.log(`ID: ${testUser._id}`);
    console.log(`Email: ${testUser.email}`);
    console.log(`Name: ${testUser.name}`);

    await mongoose.connection.close();
    console.log('\n✅ Setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
};

createTestUser();