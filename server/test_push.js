const admin = require('firebase-admin');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Initialize Firebase Admin SDK using firebase.json
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'firebase.json');

let firebaseConfig;
try {
  firebaseConfig = require(serviceAccountPath);
  console.log('✅ Firebase service account loaded from firebase.json');
  console.log(`📋 Project ID: ${firebaseConfig.project_id}`);
} catch (error) {
  console.error('❌ Error loading firebase.json:', error.message);
  console.log('Please ensure firebase.json exists in the backend directory');
  process.exit(1);
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      projectId: firebaseConfig.project_id
    });
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    process.exit(1);
  }
}

// Connect to MongoDB - Use the same connection as the main app
mongoose.connect(process.env.MONGO_URL, {
  dbName: 'masterAiApiKey',
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('✅ Connected to MongoDB');
});

// Test notification configurations
const testNotifications = {
  simple: {
    notification: {
      title: '🎉 Master AI Notification',
      body: 'This is a test notification from Master AI!',
    },
    data: {
      type: 'test',
      timestamp: Date.now().toString(),
      action: 'open_app'
    }
  },

  dataOnly: {
    data: {
      type: 'silent_update',
      title: 'Background Update',
      body: 'Your content has been updated',
      timestamp: Date.now().toString(),
      action: 'sync_data'
    }
  },

  actionable: {
    notification: {
      title: '🚀 New Feature Available!',
      body: 'Check out the new AI automation features',
      imageUrl: 'https://via.placeholder.com/512x256/6200ee/ffffff?text=Master+AI'
    },
    data: {
      type: 'feature_announcement',
      feature: 'automation',
      screen: 'SocialAutomate',
      timestamp: Date.now().toString()
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#6200ee',
        sound: 'default',
        channelId: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  },

  promotional: {
    notification: {
      title: '💎 Upgrade to Premium',
      body: 'Get unlimited AI generations with Premium subscription!',
    },
    data: {
      type: 'promotion',
      campaign: 'premium_upgrade',
      action: 'open_subscription',
      timestamp: Date.now().toString()
    }
  },

  approval: {
    notification: {
      title: 'Your post is ready to review',
      body: 'Your AI-generated tech post about artificial intelligence and machine learning innovations is ready for approval...',
      imageUrl: 'https://via.placeholder.com/512x256/667eea/ffffff?text=Tech+Post+Ready'
    },
    data: {
      type: 'post_approval',
      postId: '507f1f77bcf86cd799439011', // Example ObjectId
      userId: '507f1f77bcf86cd799439012',
      approvalToken: 'example-approval-token-123',
      screen: 'PostApproval',
      action: 'review_post',
      deepLink: 'masterai://approval/507f1f77bcf86cd799439011',
      timestamp: Date.now().toString()
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#667eea',
        channelId: 'post_approval',
        priority: 'high',
        defaultSound: true
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        action_1: 'approve_and_share',
        action_1_title: 'Approve and Share',
        action_2: 'dismiss',
        action_2_title: 'Cancel'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          category: 'POST_APPROVAL',
          'thread-id': 'post_approval'
        }
      }
    }
  }
};

/**
 * Get all FCM tokens from the database
 */
async function getAllFCMTokens() {
  try {
    const users = await User.find(
      { 'deviceTokens.0': { $exists: true } },
      { deviceTokens: 1, name: 1, email: 1 }
    );

    const tokens = [];
    users.forEach(user => {
      user.deviceTokens.forEach(device => {
        tokens.push({
          token: device.token,
          platform: device.platform,
          userName: user.name,
          userEmail: user.email,
          registeredAt: device.registeredAt
        });
      });
    });

    return tokens;
  } catch (error) {
    console.error('Error fetching FCM tokens:', error);
    return [];
  }
}

/**
 * Send notification to a single token
 */
async function sendToToken(token, message, testType) {
  try {
    console.log(`\n📤 Sending ${testType} notification to token: ${token.substring(0, 20)}...`);

    const response = await admin.messaging().send({
      token: token,
      ...message
    });

    console.log('✅ Successfully sent message:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending message:', error.errorInfo || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple tokens
 */
async function sendToMultipleTokens(tokens, message, testType) {
  try {
    console.log(`\n📤 Sending ${testType} notification to ${tokens.length} tokens...`);

    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...message
    });

    console.log(`✅ Successfully sent ${response.successCount} messages`);
    if (response.failureCount > 0) {
      console.log(`❌ Failed to send ${response.failureCount} messages`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`   - Token ${idx}: ${resp.error?.message}`);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Error sending multicast:', error);
    return null;
  }
}

/**
 * Send notification to specific user by email
 */
async function sendToUser(email, message, testType) {
  try {
    const user = await User.findOne({ email: email });

    if (!user || user.deviceTokens.length === 0) {
      console.log(`❌ No FCM tokens found for user: ${email}`);
      return;
    }

    console.log(`\n📤 Sending ${testType} notification to user: ${user.name} (${email})`);
    console.log(`   User has ${user.deviceTokens.length} registered device(s)`);

    const tokens = user.deviceTokens.map(device => device.token);

    if (tokens.length === 1) {
      return await sendToToken(tokens[0], message, testType);
    } else {
      return await sendToMultipleTokens(tokens, message, testType);
    }
  } catch (error) {
    console.error('❌ Error sending to user:', error);
  }
}

/**
 * List all registered tokens
 */
async function listTokens() {
  const tokens = await getAllFCMTokens();

  console.log('\n📱 Registered FCM Tokens:');
  console.log('========================');

  if (tokens.length === 0) {
    console.log('No FCM tokens found in database');
    return;
  }

  tokens.forEach((tokenInfo, index) => {
    console.log(`${index + 1}. User: ${tokenInfo.userName} (${tokenInfo.userEmail})`);
    console.log(`   Platform: ${tokenInfo.platform}`);
    console.log(`   Token: ${tokenInfo.token.substring(0, 30)}...`);
    console.log(`   Registered: ${tokenInfo.registeredAt}`);
    console.log('   ---');
  });

  console.log(`\nTotal: ${tokens.length} tokens from ${new Set(tokens.map(t => t.userEmail)).size} users`);
}

/**
 * Test all notification types
 */
async function testAllNotifications(email = null) {
  console.log('\n🧪 Testing All Notification Types');
  console.log('==================================');

  for (const [type, message] of Object.entries(testNotifications)) {
    console.log(`\n--- Testing ${type.toUpperCase()} notification ---`);

    if (email) {
      await sendToUser(email, message, type);
    } else {
      const tokens = await getAllFCMTokens();
      if (tokens.length > 0) {
        const firstToken = tokens[0].token;
        await sendToToken(firstToken, message, type);
      }
    }

    // Wait 2 seconds between notifications
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  console.log('🚀 Master AI FCM Push Notification Tester');
  console.log('==========================================\n');

  try {
    switch (command) {
      case 'list':
        await listTokens();
        break;

      case 'test':
        if (param) {
          console.log(`Testing notifications for user: ${param}`);
          await testAllNotifications(param);
        } else {
          console.log('Testing notifications for first registered user...');
          await testAllNotifications();
        }
        break;

      case 'simple':
        if (param) {
          await sendToUser(param, testNotifications.simple, 'simple');
        } else {
          const tokens = await getAllFCMTokens();
          if (tokens.length > 0) {
            await sendToToken(tokens[0].token, testNotifications.simple, 'simple');
          }
        }
        break;

      case 'data':
        if (param) {
          await sendToUser(param, testNotifications.dataOnly, 'data-only');
        } else {
          const tokens = await getAllFCMTokens();
          if (tokens.length > 0) {
            await sendToToken(tokens[0].token, testNotifications.dataOnly, 'data-only');
          }
        }
        break;

      case 'approval':
        if (param) {
          await sendToUser(param, testNotifications.approval, 'approval');
        } else {
          const tokens = await getAllFCMTokens();
          if (tokens.length > 0) {
            await sendToToken(tokens[0].token, testNotifications.approval, 'approval');
          }
        }
        break;

      case 'all':
        const tokens = await getAllFCMTokens();
        if (tokens.length > 0) {
          const allTokens = tokens.map(t => t.token);
          await sendToMultipleTokens(allTokens, testNotifications.simple, 'broadcast');
        }
        break;

      default:
        console.log('📖 Usage:');
        console.log('  node test_push.js list                    # List all registered FCM tokens');
        console.log('  node test_push.js test [email]            # Test all notification types');
        console.log('  node test_push.js simple [email]          # Send simple notification');
        console.log('  node test_push.js data [email]            # Send data-only notification');
        console.log('  node test_push.js approval [email]        # Send post approval notification');
        console.log('  node test_push.js all                     # Send to all registered tokens');
        console.log('\nExamples:');
        console.log('  node test_push.js list');
        console.log('  node test_push.js test user@example.com');
        console.log('  node test_push.js simple');
        console.log('  node test_push.js approval user@example.com');
        console.log('  node test_push.js all');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n✅ Test completed');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main();