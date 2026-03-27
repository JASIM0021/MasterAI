const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.templatesPath = path.join(__dirname, '../templates/email');

    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment
   */
  async initializeTransporter() {
    try {
      // Configure based on environment variables
      const emailConfig = {
        service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, yahoo, etc.
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };

      // For development, use Ethereal Email (test account)
      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
        console.log('🔧 Creating test email account for development...');
        const testAccount = await nodemailer.createTestAccount();

        emailConfig.host = 'smtp.ethereal.email';
        emailConfig.port = 587;
        emailConfig.secure = false;
        emailConfig.auth = {
          user: testAccount.user,
          pass: testAccount.pass
        };

        console.log('📧 Test email account created:', testAccount.user);
        console.log('🔗 Preview emails at: https://ethereal.email');
      }
 this.transporter  = nodemailer.createTransport({
    host: 'smtp.gmail.com', // You may change this if using a different email provider
    port: 587,
    secure: process.env.NODE_ENV === 'production',
    auth: {
      user: process.env.MAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;

      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send post approval email to user
   */
  async sendApprovalEmail(user, post) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      // Generate URLs that redirect to mobile app (using domain: masterai.fun)
      const baseApiUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const approvalUrl = `${baseApiUrl}/api/approval/approve/${post.approval.approvalToken}?action=approve&redirect=app`;
      const rejectUrl = `${baseApiUrl}/api/approval/approve/${post.approval.approvalToken}?action=reject&redirect=app`;
      const previewUrl = `${baseApiUrl}/api/approval/approve/${post.approval.approvalToken}?redirect=app`;

      const emailContent = await this.generateApprovalEmailContent({
        user,
        post,
        approvalUrl,
        rejectUrl,
        previewUrl
      });

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'MasterAI Automation',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: user.email,
        subject: `📝 New post ready for approval: "${this.truncateText(post.content.text, 50)}"`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Approval email sent to ${user.email} for post: ${post._id}`);

      // Log preview URL for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result)
      };
    } catch (error) {
      console.error('Failed to send approval email:', error);
      throw error;
    }
  }

  /**
   * Send notification when post is approved/rejected
   */
  async sendApprovalStatusEmail(user, post, status, reason = null) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      const isApproved = status === 'approved';
      const emailContent = await this.generateStatusEmailContent({
        user,
        post,
        isApproved,
        reason
      });

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'MasterAI Automation',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: user.email,
        subject: `${isApproved ? '✅' : '❌'} Post ${status}: "${this.truncateText(post.content.text, 50)}"`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Status email sent to ${user.email} for post: ${post._id} (${status})`);

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result)
      };
    } catch (error) {
      console.error('Failed to send status email:', error);
      throw error;
    }
  }

  /**
   * Send batch notification summary
   */
  async sendBatchSummaryEmail(user, posts) {
    if (!this.isConfigured || !posts || posts.length === 0) {
      return;
    }

    try {
      const pendingPosts = posts.filter(p => p.status === 'pending_approval');
      const approvedPosts = posts.filter(p => p.status === 'approved');
      const rejectedPosts = posts.filter(p => p.status === 'rejected');

      if (pendingPosts.length === 0 && approvedPosts.length === 0 && rejectedPosts.length === 0) {
        return;
      }

      const emailContent = await this.generateBatchSummaryContent({
        user,
        pendingPosts,
        approvedPosts,
        rejectedPosts
      });

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'MasterAI Automation',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: user.email,
        subject: `📊 Daily Automation Summary - ${pendingPosts.length} pending posts`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Batch summary sent to ${user.email}: ${pendingPosts.length} pending posts`);

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result)
      };
    } catch (error) {
      console.error('Failed to send batch summary:', error);
      throw error;
    }
  }

  /**
   * Send credit limit warning email
   */
  async sendCreditWarningEmail(user, creditInfo) {
    if (!this.isConfigured) {
      return;
    }

    try {
      const usagePercentage = Math.round((creditInfo.used / creditInfo.total) * 100);

      const emailContent = await this.generateCreditWarningContent({
        user,
        creditInfo,
        usagePercentage
      });

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'MasterAI Automation',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: user.email,
        subject: `⚠️ Automation Credits Warning - ${usagePercentage}% used`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Credit warning sent to ${user.email}: ${usagePercentage}% used`);

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result)
      };
    } catch (error) {
      console.error('Failed to send credit warning:', error);
      throw error;
    }
  }

  /**
   * Generate approval email content
   */
  async generateApprovalEmailContent({ user, post, approvalUrl, rejectUrl, previewUrl }) {
    const postPreview = this.truncateText(post.content.text, 200);
    const hashtags = post.content.hashtags ? post.content.hashtags.join(' ') : '';
    const platforms = post.targetPlatforms.map(p => p.platform).join(', ');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post Approval Required</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .post-preview { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .buttons { text-align: center; margin: 30px 0; }
            .btn { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .btn-approve { background: #28a745; color: white; }
            .btn-reject { background: #dc3545; color: white; }
            .btn:hover { opacity: 0.8; }
            .meta { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🤖 New Post Ready for Approval</h1>
            <p>Your automation has generated new content for review</p>
        </div>

        <div class="content">
            <p>Hi ${user.name},</p>

            <p>Your automation has generated a new post that requires your approval before publishing.</p>

            <div class="post-preview">
                <h3>📝 Generated Content:</h3>
                <p style="font-size: 16px; line-height: 1.6;">${postPreview}</p>
                ${hashtags ? `<p style="color: #667eea; font-weight: bold;">${hashtags}</p>` : ''}
            </div>

            <div class="meta">
                <strong>📊 Post Details:</strong><br>
                <strong>Platforms:</strong> ${platforms}<br>
                <strong>Generated:</strong> ${new Date(post.createdAt).toLocaleString()}<br>
                <strong>Type:</strong> ${post.isAiGenerated ? 'AI Generated' : 'Template'}<br>
                ${post.aiGeneration?.topic ? `<strong>Topic:</strong> ${post.aiGeneration.topic}<br>` : ''}
                ${post.aiGeneration?.tone ? `<strong>Tone:</strong> ${post.aiGeneration.tone}<br>` : ''}
            </div>

            <div class="buttons">
                <a href="${previewUrl}" class="btn" style="background-color: #007bff; margin-right: 10px;">👁️ Preview in App</a>
                <a href="${approvalUrl}" class="btn btn-approve">✅ Approve Post</a>
                <a href="${rejectUrl}" class="btn btn-reject">❌ Reject Post</a>
            </div>

            <p style="text-align: center; margin-top: 20px;">
                <small>You can also manage your posts directly in the
                <a href="${process.env.FRONTEND_URL}/dashboard">MasterAI Dashboard</a></small>
            </p>
        </div>

        <div class="footer">
            <p>This email was sent by MasterAI Automation System</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    </body>
    </html>`;

    const text = `
    New Post Ready for Approval

    Hi ${user.name},

    Your automation has generated a new post that requires your approval:

    Generated Content:
    ${postPreview}
    ${hashtags}

    Post Details:
    - Platforms: ${platforms}
    - Generated: ${new Date(post.createdAt).toLocaleString()}
    - Type: ${post.isAiGenerated ? 'AI Generated' : 'Template'}
    ${post.aiGeneration?.topic ? `- Topic: ${post.aiGeneration.topic}` : ''}
    ${post.aiGeneration?.tone ? `- Tone: ${post.aiGeneration.tone}` : ''}

    Actions:
    Preview in App: ${previewUrl}
    Approve: ${approvalUrl}
    Reject: ${rejectUrl}

    Dashboard: ${process.env.FRONTEND_URL}/dashboard
    `;

    return { html, text };
  }

  /**
   * Generate status email content
   */
  async generateStatusEmailContent({ user, post, isApproved, reason }) {
    const postPreview = this.truncateText(post.content.text, 150);
    const statusText = isApproved ? 'approved' : 'rejected';
    const statusEmoji = isApproved ? '✅' : '❌';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post ${statusText}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isApproved ? '#28a745' : '#dc3545'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .post-preview { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${statusEmoji} Post ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h1>
        </div>

        <div class="content">
            <p>Hi ${user.name},</p>

            <p>Your post has been <strong>${statusText}</strong>.</p>

            <div class="post-preview">
                <h3>📝 Post Content:</h3>
                <p>${postPreview}</p>
            </div>

            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}

            ${isApproved ? `
            <p>Your post is now ready for publishing. You can share it to your social media platforms from the dashboard.</p>
            ` : `
            <p>You can create a new automation or manually create content from your dashboard.</p>
            `}

            <p style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
            </p>
        </div>

        <div class="footer">
            <p>This email was sent by MasterAI Automation System</p>
        </div>
    </body>
    </html>`;

    const text = `
    Post ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}

    Hi ${user.name},

    Your post has been ${statusText}.

    Post Content:
    ${postPreview}

    ${reason ? `Reason: ${reason}` : ''}

    ${isApproved ?
      'Your post is now ready for publishing. You can share it to your social media platforms from the dashboard.' :
      'You can create a new automation or manually create content from your dashboard.'
    }

    Dashboard: ${process.env.FRONTEND_URL}/dashboard
    `;

    return { html, text };
  }

  /**
   * Generate batch summary content
   */
  async generateBatchSummaryContent({ user, pendingPosts, approvedPosts, rejectedPosts }) {
    const totalPosts = pendingPosts.length + approvedPosts.length + rejectedPosts.length;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Automation Summary</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .summary-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .stat { display: inline-block; margin: 10px 20px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Daily Automation Summary</h1>
            <p>${new Date().toLocaleDateString()}</p>
        </div>

        <div class="content">
            <p>Hi ${user.name},</p>

            <p>Here's your automation activity for today:</p>

            <div class="summary-card">
                <div style="text-align: center;">
                    <div class="stat">
                        <div class="stat-number">${pendingPosts.length}</div>
                        <div>Pending Approval</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${approvedPosts.length}</div>
                        <div>Approved</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${rejectedPosts.length}</div>
                        <div>Rejected</div>
                    </div>
                </div>
            </div>

            ${pendingPosts.length > 0 ? `
            <div class="summary-card">
                <h3>📝 Posts Awaiting Approval:</h3>
                ${pendingPosts.slice(0, 3).map(post => `
                    <p>• ${this.truncateText(post.content.text, 80)}</p>
                `).join('')}
                ${pendingPosts.length > 3 ? `<p><em>...and ${pendingPosts.length - 3} more</em></p>` : ''}

                <p style="text-align: center; margin-top: 20px;">
                    <a href="${process.env.FRONTEND_URL}/posts/pending" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Review Pending Posts</a>
                </p>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>This email was sent by MasterAI Automation System</p>
        </div>
    </body>
    </html>`;

    const text = `
    Daily Automation Summary - ${new Date().toLocaleDateString()}

    Hi ${user.name},

    Here's your automation activity for today:

    📊 Summary:
    - ${pendingPosts.length} posts pending approval
    - ${approvedPosts.length} posts approved
    - ${rejectedPosts.length} posts rejected

    ${pendingPosts.length > 0 ? `
    📝 Posts Awaiting Approval:
    ${pendingPosts.slice(0, 5).map(post => `• ${this.truncateText(post.content.text, 80)}`).join('\n')}
    ${pendingPosts.length > 5 ? `...and ${pendingPosts.length - 5} more` : ''}

    Review: ${process.env.FRONTEND_URL}/posts/pending
    ` : ''}

    Dashboard: ${process.env.FRONTEND_URL}/dashboard
    `;

    return { html, text };
  }

  /**
   * Generate credit warning content
   */
  async generateCreditWarningContent({ user, creditInfo, usagePercentage }) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Automation Credits Warning</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6b35; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credit-bar { background: #e9ecef; height: 20px; border-radius: 10px; margin: 20px 0; overflow: hidden; }
            .credit-fill { background: ${usagePercentage >= 90 ? '#dc3545' : usagePercentage >= 80 ? '#ffc107' : '#28a745'}; height: 100%; width: ${usagePercentage}%; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>⚠️ Automation Credits Warning</h1>
        </div>

        <div class="content">
            <p>Hi ${user.name},</p>

            <p>You've used <strong>${usagePercentage}%</strong> of your automation credits.</p>

            <div class="credit-bar">
                <div class="credit-fill"></div>
            </div>

            <p><strong>Usage:</strong> ${creditInfo.used} of ${creditInfo.total} credits used</p>
            <p><strong>Remaining:</strong> ${creditInfo.available} credits</p>
            <p><strong>Reset Date:</strong> ${new Date(creditInfo.resetDate).toLocaleDateString()}</p>

            ${usagePercentage >= 90 ? `
            <p style="color: #dc3545; font-weight: bold;">⚠️ You're running low on credits! Consider upgrading your plan or wait for the next reset cycle.</p>
            ` : `
            <p>Monitor your usage to ensure your automations continue running smoothly.</p>
            `}
        </div>

        <div class="footer">
            <p>This email was sent by MasterAI Automation System</p>
        </div>
    </body>
    </html>`;

    const text = `
    Automation Credits Warning

    Hi ${user.name},

    You've used ${usagePercentage}% of your automation credits.

    Usage Details:
    - Used: ${creditInfo.used} of ${creditInfo.total} credits
    - Remaining: ${creditInfo.available} credits
    - Reset Date: ${new Date(creditInfo.resetDate).toLocaleDateString()}

    ${usagePercentage >= 90 ?
      '⚠️ You\'re running low on credits! Consider upgrading your plan or wait for the next reset cycle.' :
      'Monitor your usage to ensure your automations continue running smoothly.'
    }
    `;

    return { html, text };
  }

  /**
   * Utility function to truncate text
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if email service is configured
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Test email functionality
   */
  async testEmail(recipientEmail) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'MasterAI Automation',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: recipientEmail,
      subject: '✅ MasterAI Email Service Test',
      html: `
        <h2>Email Service Test</h2>
        <p>This is a test email from MasterAI Automation System.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you received this email, the service is working correctly!</p>
      `,
      text: `
        Email Service Test

        This is a test email from MasterAI Automation System.
        Time: ${new Date().toISOString()}

        If you received this email, the service is working correctly!
      `
    };

    const result = await this.transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: result.messageId,
      previewUrl: nodemailer.getTestMessageUrl(result)
    };
  }
}

module.exports = EmailService;