// services/notificationService.js
const ApiKey = require('../models/ApiKey');
const { sendEmail } = require('../utils/sendMail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function checkExpiringKeys() {
  const soon = new Date();
  soon.setDate(soon.getDate() + 7); // 7 days from now

  const expiringKeys = await ApiKey.find({
    expiresAt: { $lte: soon },
    isActive: true,
  }).populate('owner');

  for (const key of expiringKeys) {
    if (key.owner.email) {
      await sendEmail(
        key.owner.email,
        `Your API key "${key.name}" will expire on ${key.expiresAt}.`,
        'Your API key is expiring soon',
      );
    }
  }
}

// Run daily
setInterval(checkExpiringKeys, 24 * 60 * 60 * 1000);
