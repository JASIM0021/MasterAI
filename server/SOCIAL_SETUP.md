# Social Media Integration Setup Guide

This guide will help you set up the social media API keys and configurations needed for the Master AI social automation features.

## Prerequisites

Before starting, ensure you have:
- Administrator access to the social media accounts you want to connect
- A working Master AI application
- MongoDB database running
- Node.js backend server configured

## API Setup Instructions

### 1. Facebook/Instagram Integration

#### Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as the app type
4. Fill in your app details:
   - App Name: "Master AI Social Automation"
   - Contact Email: Your email
5. Create the app

#### Configure Facebook App
1. In your app dashboard, go to "App Settings" → "Basic"
2. Add your app domains and website URL
3. Go to "Products" and add:
   - **Facebook Login**
   - **Instagram Basic Display** (for Instagram)
   - **Pages API**
4. Configure Facebook Login:
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/social/auth/facebook/callback`
5. Configure Instagram Basic Display:
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/social/auth/instagram/callback`

#### Get API Credentials
1. Go to "App Settings" → "Basic"
2. Copy your **App ID** and **App Secret**
3. Update your `.env` file:
   ```
   FACEBOOK_APP_ID=your_app_id_here
   FACEBOOK_APP_SECRET=your_app_secret_here
   ```

### 2. LinkedIn Integration

#### Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in the required information:
   - App Name: "Master AI Social Automation"
   - LinkedIn Page: Your company page (create one if needed)
   - App Logo: Upload a logo
4. Create the app

#### Configure LinkedIn App
1. In the "Products" tab, request access to:
   - **Sign In with LinkedIn**
   - **Share on LinkedIn**
2. In the "Auth" tab:
   - Add Authorized redirect URLs: `http://localhost:3000/api/social/auth/linkedin/callback`

#### Get API Credentials
1. Go to the "Auth" tab
2. Copy your **Client ID** and **Client Secret**
3. Update your `.env` file:
   ```
   LINKEDIN_CLIENT_ID=your_client_id_here
   LINKEDIN_CLIENT_SECRET=your_client_secret_here
   ```

### 3. Twitter Integration

#### Create Twitter App
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Apply for a developer account if you don't have one
3. Create a new project and app
4. Fill in your app details

#### Configure Twitter App
1. In your app dashboard, go to "Settings"
2. Enable "OAuth 1.0a" if not already enabled
3. Set the callback URL: `http://localhost:3000/api/social/auth/twitter/callback`
4. Set permissions to "Read and Write"

#### Get API Credentials
1. Go to "Keys and Tokens"
2. Copy your **Consumer Key** and **Consumer Secret**
3. Update your `.env` file:
   ```
   TWITTER_CONSUMER_KEY=your_consumer_key_here
   TWITTER_CONSUMER_SECRET=your_consumer_secret_here
   ```

## Environment Variables

Ensure your `.env` file contains all required variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key

# Social Media APIs
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret

# AI Content Generation
GOOGLE_API_KEY=your_google_api_key

# Security
SOCIAL_ENCRYPTION_KEY=your-encryption-key-for-tokens
```

## Testing the Setup

1. Start your backend server:
   ```bash
   cd master-ai-backend
   npm run dev
   ```

2. Start your React Native app:
   ```bash
   npm start
   ```

3. Navigate to the Social Automate section
4. Try connecting each social media platform
5. Check the browser console and server logs for any errors

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Ensure redirect URLs in your app settings match exactly
   - Check for HTTP vs HTTPS mismatches

2. **Invalid Client Credentials**
   - Double-check your API keys and secrets
   - Ensure no extra spaces or characters

3. **Permission Denied**
   - Some platforms require app review for certain permissions
   - Start with basic permissions and request additional ones as needed

4. **CORS Issues**
   - Ensure your backend server has proper CORS configuration
   - Check the frontend URL in your environment variables

### Getting Help

If you encounter issues:
1. Check the application logs in the console
2. Verify all environment variables are set correctly
3. Ensure your social media apps are properly configured
4. Test the OAuth flow in a browser first

## Security Notes

- Keep your API keys and secrets secure
- Never commit them to version control
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Review app permissions periodically

## Next Steps

Once setup is complete:
1. Connect your social media accounts
2. Create your first automated post
3. Set up scheduling rules
4. Monitor analytics and performance

For additional features and advanced configuration, refer to the main documentation.