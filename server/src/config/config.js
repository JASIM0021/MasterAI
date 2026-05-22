require('dotenv').config();

module.exports = {
  apiKey: process.env.GOOGLE_API_KEY,
  masterAiapiKey: process.env.MASTER_AI_API_KEY,
  port: process.env.PORT || 3000,
};
