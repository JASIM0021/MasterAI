const { sendEmail } = require('../utils/sendMail');

const userServices = {
  report: async data => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
  <div style="background: linear-gradient(135deg, #6a82fb, #fc5c7d); border-radius: 10px 10px 0 0; padding: 20px; text-align: center;">
    <h1 style="color: white; font-size: 24px;">🎨 Master AI:Gpt Magic in Hand</h1>
    <p style="color: #fff; font-size: 16px;">Thank You for Your Valuable Feedback!</p>
  </div>
  
  <div style="padding: 20px;">
    <p style="font-size: 16px;">Dear <strong style="color: #6a82fb;">${
      data?.user_name
    }</strong>,</p>
    
    <p style="font-size: 16px;">We are thrilled to inform you that we have received your report regarding the AI-generated content. Your insights are like colors on a palette, essential for creating a beautiful masterpiece!</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
      <p style="font-weight: bold;">Your Feedback:</p>
      <p style="font-style: italic; font-size: 14px; color: #555;">"${
        data?.feedback
      }"</p>
    </div>
    
    <p style="font-size: 16px;">As our AI evolves, your feedback is a brushstroke that helps us refine our art. Thank you for being a part of this creative journey!</p>
    
    <p style="font-size: 16px;">We would love to hear more from you! If you have additional thoughts, feel free to reply to this email.</p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="mailto:maasterrai@gmail.com" style="background-color: #6a82fb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; transition: background-color 0.3s;">🎨 Share More Thoughts</a>
    </div>
    
    <p style="font-size: 16px;">Best regards,<br>The Master AI Team</p>
  </div>
  
  <footer style="margin-top: 20px; font-size: 12px; color: #888; text-align: center;">

    <p style="font-size: 14px;">&copy; ${new Date().getFullYear()} Master AI. All rights reserved.</p>
  </footer>
</div>
    `;

    try {
      await sendEmail(
        data?.email,
        html,
        'Thanks for your feedback - Master AI',
      );
      return {
        status: 200,
        message: 'Feedback received successfully',
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        status: 500,
        message: 'Failed to send feedback confirmation email',
      };
    }
  },
};

module.exports = {
  userServices,
};
