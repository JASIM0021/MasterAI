const express = require('express');
const { generateCode } = require('../controllers/fileController');
const Type = require('../Type');
const { apiKeyAuth, requireScope } = require('../middleware/authMiddleware');
const keyRateLimiter = require('../middleware/rateLimitMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const {
  apikeyController,
  registerDevice,
  generateWebsiteContentController,
  deployWebsite,
} = require('../controllers/apikeyController');
const { GenerateLogs, EnhancePrompt } = require('../services/logi-ai/logoAiService');

const router = express.Router();

router.post(
  '/getCoding',
  apiKeyAuth,
  requireScope('basic'),
  // keyRateLimiter({ max: 50 }),
  async (req, res) => generateCode(req, res, Type.getCoding),
);
router.get('/verify-key', apikeyController);
// Register device with API key
router.post('/register-device', registerDevice);
router.post('/website-builder', generateWebsiteContentController);
router.post('/deploy', deployWebsite)
router.post('/generate-logos', GenerateLogs);
router.post('/enhance-prompt', EnhancePrompt);
module.exports = router;
