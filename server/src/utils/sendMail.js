const nodemailer = require('nodemailer');

const sendEmail = async (to, html, subject, attachment) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // You may change this if using a different email provider
    port: 587,
    secure: process.env.NODE_ENV === 'production',
    auth: {
      user: process.env.MAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_FROM, // Replace with your email
    to, // Receiver(s) - can be a single email or an array
    subject, // Email subject
    text: '', // You can also add plain text if needed
    html, // The HTML content of the email
    attachments: attachment
      ? [{ path: Array.isArray(attachment) ? attachment[0] : attachment }]
      : [], // Ensure path is a string // Attachments if provided
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
};
