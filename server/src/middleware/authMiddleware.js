// middleware/authMiddleware.js

const apiKeyService = require('../services/apiKeyService');

async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  console.log('apiKey', apiKey);
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const keyData = await apiKeyService.validateKey(apiKey);
    console.log('keyData', keyData);
    req.apiKey = keyData.apiKey;
    next();
  } catch (err) {
    console.log('err', err);
    return res.status(403).json({ error: err.message });
  }
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req?.apiKey?.scopes?.includes(scope)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  apiKeyAuth,
  requireScope,
};
