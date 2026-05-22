# Social Media API Keys Setup Guide

This document walks you through creating developer apps and getting API keys for every social platform used by MasterAI's Social Automation feature.

After completing each section, paste the keys into `server/.env`.

---

## What You Need in .env

```env
# Facebook / Instagram
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Twitter / X
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=

# Deep link scheme (already set — do not change)
APP_SCHEME=masterai
```

Your server's public URL is also required for OAuth callbacks.
If testing locally, use **ngrok** (`ngrok http 3000`) and set:
```env
FRONTEND_URL=https://YOUR-NGROK-SUBDOMAIN.ngrok.io
```
In production set it to your real domain: `https://masteraiapi.todayintech.in`

---

---

## 1. Facebook & Instagram

Facebook and Instagram share one developer app. You need a Facebook Business account.

### Step 1 — Create a Facebook Developer Account
1. Go to: https://developers.facebook.com
2. Click **Get Started** (top right)
3. Complete the developer registration

### Step 2 — Create an App
1. Go to: https://developers.facebook.com/apps
2. Click **Create App**
3. Choose **Business** as the app type → click Next
4. Enter:
   - App name: `MasterAI`
   - Contact email: your email
5. Click **Create App**

### Step 3 — Add Products
On your app dashboard, click **Add Product** and add both:
- **Facebook Login** → click Set Up
- **Instagram Graph API** → click Set Up

### Step 4 — Configure Facebook Login
1. In the left sidebar go to **Facebook Login → Settings**
2. Under **Valid OAuth Redirect URIs** add:
   ```
   https://YOUR-SERVER-DOMAIN/api/social/auth/facebook/callback
   ```
3. Click **Save Changes**

### Step 5 — Get Your Keys
1. In the left sidebar go to **Settings → Basic**
2. Copy:
   - **App ID** → paste as `FACEBOOK_APP_ID`
   - **App Secret** (click Show) → paste as `FACEBOOK_APP_SECRET`

### Step 6 — Required Permissions
Your app needs these permissions. Go to **App Review → Permissions and Features** and request:
- `pages_manage_posts`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`

> **Note:** While the app is in Development mode, only you (the app admin) can test OAuth. To allow other users you must submit for App Review and go Live.

### Step 7 — Add Test Users (for development)
1. Go to **Roles → Test Users**
2. Click **Add Test Users**
3. Add yourself or team members for testing without App Review

---

---

## 2. LinkedIn

LinkedIn requires a company page and a verified LinkedIn account.

### Step 1 — Create a LinkedIn Developer Account
1. Go to: https://www.linkedin.com/developers
2. Click **Create App**

### Step 2 — Create the App
Fill in:
| Field | Value |
|---|---|
| App name | MasterAI |
| LinkedIn Page | Your company page (create one if needed at linkedin.com/company/setup/new) |
| Privacy policy URL | Your website's privacy policy URL |
| App logo | Upload a logo |

Click **Create App**.

### Step 3 — Configure OAuth Settings
1. Click the **Auth** tab on your app page
2. Under **OAuth 2.0 settings → Authorized redirect URLs** click the pencil icon and add:
   ```
   https://YOUR-SERVER-DOMAIN/api/social/auth/linkedin/callback
   ```
3. Click **Update**

### Step 4 — Request Required Permissions (Products)
1. Click the **Products** tab
2. Request access to:
   - **Share on LinkedIn** — allows posting on behalf of users
   - **Sign In with LinkedIn using OpenID Connect** — allows reading profile

> LinkedIn reviews product access requests. **Share on LinkedIn** is usually approved within 1-3 days.

### Step 5 — Get Your Keys
1. Click the **Auth** tab
2. Copy:
   - **Client ID** → paste as `LINKEDIN_CLIENT_ID`
   - **Client Secret** (click the eye icon) → paste as `LINKEDIN_CLIENT_SECRET`

### Step 6 — Verify App Association
1. Click the **Settings** tab
2. Make sure your app is associated with the correct LinkedIn Company Page
3. Click **Verify** next to the page name if prompted

---

---

## 3. Twitter / X

Twitter uses OAuth 1.0a for user context posting. You need a Twitter Developer account with **Elevated** access.

### Step 1 — Apply for a Developer Account
1. Go to: https://developer.twitter.com/en/portal/petition/essential/basic-info
2. Sign in with your Twitter account
3. Fill in the application:
   - **Use case**: Describe your use — e.g. "Building a social media automation tool that posts AI-generated content on behalf of authenticated users"
   - Answer all questions honestly
4. Submit — Basic access is approved instantly. For Elevated access (needed for posting) you may need to wait a few hours or provide more detail.

### Step 2 — Create a Project and App
1. In the Developer Portal: https://developer.twitter.com/en/portal/dashboard
2. Click **+ Create Project**
3. Enter project name: `MasterAI`
4. Select use case: **Making a bot** or **Publish and curate Tweets**
5. Add description
6. Click **Create and add an App**
7. Name the app: `MasterAI`

### Step 3 — Set App Permissions
1. In your app settings, click **Edit** next to **User authentication settings**
2. Set:
   - **App permissions**: `Read and Write`
   - **Type of App**: `Web App, Automated App or Bot`
   - **Callback URI**:
     ```
     https://YOUR-SERVER-DOMAIN/api/social/auth/twitter/callback
     ```
   - **Website URL**: Your website URL
3. Click **Save**

### Step 4 — Get Your Keys
1. Go to your app → **Keys and tokens** tab
2. Under **Consumer Keys** click **Regenerate** (or copy existing)
3. Copy:
   - **API Key** → paste as `TWITTER_CONSUMER_KEY`
   - **API Key Secret** → paste as `TWITTER_CONSUMER_SECRET`

> **Important:** Twitter OAuth 1.0a (used here) requires Consumer Key + Consumer Secret. The user's access token and secret are obtained during the OAuth flow and stored automatically.

### Step 5 — Apply for Elevated Access
Basic access only allows 1,500 tweets/month. For production:
1. Go to: https://developer.twitter.com/en/portal/products/elevated
2. Click **Apply for Elevated**
3. Fill in the use case form — mention user-authenticated posting (not bot automation)

---

---

## 4. Final .env After Setup

```env
# Facebook / Instagram
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890

# LinkedIn
LINKEDIN_CLIENT_ID=78abc123def456
LINKEDIN_CLIENT_SECRET=aBcDeFgHiJkLmNoP

# Twitter / X
TWITTER_CONSUMER_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_CONSUMER_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your server public URL (ngrok for dev, real domain for prod)
FRONTEND_URL=https://YOUR-NGROK-OR-DOMAIN.com

# Deep link (do not change)
APP_SCHEME=masterai
```

---

---

## 5. Testing the Full OAuth Flow

Once keys are set:

1. Restart your server:
   ```bash
   cd server && node app.js
   ```

2. Open the MasterAI app → go to **Social Automate** screen

3. Tap **Connect** → choose a platform

4. The browser opens the platform's login page

5. After authorizing, the browser redirects to:
   ```
   masterai://social-connect?success=true&platform=facebook&accountId=...
   ```

6. The app receives the deep link → the account appears in the Connected Accounts list

---

---

## 6. Common Errors

| Error | Cause | Fix |
|---|---|---|
| `App not set up` (Facebook) | App is in Development mode | Add yourself as a test user, or go Live |
| `Invalid redirect_uri` | Callback URL not registered | Add the exact URL to the platform's OAuth settings |
| `missing_user_id` | JWT token expired or wrong secret | Check `JWT_SECRET` matches between token creation and verification |
| `401 Unauthorized` (LinkedIn) | Wrong client ID/secret | Re-copy keys from the Auth tab |
| `403 Forbidden` (Twitter) | App doesn't have Write permission | Enable Read and Write in User authentication settings |
| `Could not authenticate you` (Twitter) | Consumer key/secret mismatch | Regenerate keys and update .env |
| Deep link not received by app | Scheme not registered | Ensure `"scheme": "masterai"` is in app.json and app is rebuilt |

---

---

## 7. App Review Requirements (for Production)

Before real users (not just you) can connect their accounts:

### Facebook / Instagram
- Submit app for review at: **App Review → Requests**
- Required permissions to submit: `pages_manage_posts`, `instagram_content_publish`
- Need a privacy policy URL and demo video showing the OAuth flow

### LinkedIn
- Products tab → **Share on LinkedIn** — submit request
- Approval is usually automatic or within 3 days

### Twitter / X
- Apply for **Elevated** access in the developer portal
- No app review needed for user-auth posting (as opposed to automated bots)

---

All keys go in `server/.env`. Never commit this file to git.
