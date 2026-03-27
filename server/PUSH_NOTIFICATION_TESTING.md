# 🚀 Firebase Push Notifications Testing Guide

This guide will help you set up and test Firebase Cloud Messaging (FCM) push notifications for the Master AI app.

## 🔧 Setup Instructions

### 1. Firebase Admin SDK Setup

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (Master AI)
3. **Go to Project Settings** → **Service accounts**
4. **Click "Generate new private key"**
5. **Download the service account JSON file**

### 2. Configure Environment Variables

1. **Copy the Firebase credentials** from the downloaded JSON file
2. **Update your `.env` file** with the following variables:

```bash
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

**⚠️ Important**: Make sure to escape the private key properly with `\n` for line breaks.

### 3. Install Dependencies

```bash
npm install firebase-admin
```

## 📱 Testing Push Notifications

### Prerequisites

1. **Ensure your React Native app is running** and has FCM tokens registered
2. **Make sure users are logged in** to register FCM tokens in the database
3. **Backend server should be running** with proper Firebase configuration

### Available Test Commands

#### 1. List All Registered FCM Tokens
```bash
node test_push.js list
```
This will show all FCM tokens registered in your database with user information.

#### 2. Test All Notification Types
```bash
# Test with first registered user
node test_push.js test

# Test with specific user
node test_push.js test user@example.com
```
This runs through all notification types (simple, data-only, actionable, promotional).

#### 3. Send Simple Notification
```bash
# Send to first registered user
node test_push.js simple

# Send to specific user
node test_push.js simple user@example.com
```

#### 4. Send Data-Only Notification
```bash
# Send to first registered user
node test_push.js data

# Send to specific user
node test_push.js data user@example.com
```

#### 5. Broadcast to All Users
```bash
node test_push.js all
```
Sends a notification to all registered FCM tokens.

## 📊 Example Output

### Listing Tokens
```
📱 Registered FCM Tokens:
========================
1. User: John Doe (john@example.com)
   Platform: android
   Token: eGlY8X9iQc:APA91bH...
   Registered: 2024-01-01T10:00:00.000Z
   ---

Total: 3 tokens from 2 users
```

### Sending Notification
```
📤 Sending simple notification to token: eGlY8X9iQc:APA91bH...
✅ Successfully sent message: projects/master-ai/messages/0:1234567890
```

## 🧪 Notification Types Included

### 1. Simple Notification
```javascript
{
  notification: {
    title: '🎉 Master AI Notification',
    body: 'This is a test notification from Master AI!',
  },
  data: {
    type: 'test',
    timestamp: '1640995200000',
    action: 'open_app'
  }
}
```

### 2. Data-Only Notification (Silent)
```javascript
{
  data: {
    type: 'silent_update',
    title: 'Background Update',
    body: 'Your content has been updated',
    timestamp: '1640995200000',
    action: 'sync_data'
  }
}
```

### 3. Actionable Notification
```javascript
{
  notification: {
    title: '🚀 New Feature Available!',
    body: 'Check out the new AI automation features',
    imageUrl: 'https://via.placeholder.com/512x256/6200ee/ffffff?text=Master+AI'
  },
  data: {
    type: 'feature_announcement',
    feature: 'automation',
    screen: 'SocialAutomate',
    timestamp: '1640995200000'
  }
}
```

### 4. Promotional Notification
```javascript
{
  notification: {
    title: '💎 Upgrade to Premium',
    body: 'Get unlimited AI generations with Premium subscription!',
  },
  data: {
    type: 'promotion',
    campaign: 'premium_upgrade',
    action: 'open_subscription',
    timestamp: '1640995200000'
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"No FCM tokens found"**
   - Make sure users have logged into the app
   - Check that the FCM service is initialized in the React Native app
   - Verify tokens are being saved to the database

2. **"Authentication failed"**
   - Check your Firebase service account credentials
   - Ensure the private key is properly escaped in .env file
   - Verify the Firebase project ID is correct

3. **"Invalid registration token"**
   - FCM tokens can expire or become invalid
   - The app should handle token refresh automatically
   - Remove old/invalid tokens from the database

4. **"Notification not received"**
   - Check if the app has notification permissions
   - Verify the app is not in battery optimization mode (Android)
   - Test with both foreground and background app states

### Debug Steps

1. **Check console logs** in the React Native app for FCM token generation
2. **Verify database** has FCM tokens stored correctly
3. **Test with a simple notification** first before complex ones
4. **Check Firebase Console** → Cloud Messaging for delivery reports

## 📝 React Native App Integration

### Expected Console Output (React Native)
When the app initializes, you should see:
```
=== FCM TOKEN ===
Full FCM Token: eGlY8X9iQc:APA91bH...full token here...
FCM Token (first 50 chars): eGlY8X9iQc:APA91bH...
Platform: android
================
```

### Testing Foreground Notifications
1. Keep the app open and in the foreground
2. Send a test notification
3. You should see the notification handled by the app

### Testing Background Notifications
1. Put the app in the background
2. Send a test notification
3. You should see a system notification

## 🚀 Next Steps

1. **Integrate with app features**: Use the notification service for real features like:
   - Post approval notifications
   - Credit updates
   - Feature announcements
   - Promotional campaigns

2. **Add notification categories**: Set up Android notification channels and iOS notification categories

3. **Analytics**: Track notification delivery and engagement rates

4. **Scheduling**: Implement scheduled notifications for better user engagement

## 📚 Useful Links

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage)
- [Firebase Admin SDK for Node.js](https://firebase.google.com/docs/admin/setup)

---

**🎉 Happy Testing!** Your push notification system is now ready for comprehensive testing.