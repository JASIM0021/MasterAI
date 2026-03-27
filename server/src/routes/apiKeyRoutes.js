// routes/adminApiKeyRoutes.js
const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/adminMiddleware');
const ApiKey = require('../model/ApiKey');
const apiKeyService = require('../services/apiKeyService');

// Admin: Get all API keys
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search
      ? {
          $or: [
            { key: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const keys = await ApiKey.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort('-createdAt');

    const count = await ApiKey.countDocuments(query);

    res.json({
      keys,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create API key for any user
router.post('/', async (req, res) => {
  try {
    const key = await apiKeyService.createKey(req.body);
    res.json(key);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Revoke any API key
router.delete('/:id', async (req, res) => {
  try {
    const key = await apiKeyService.revokeKey(req.params.id);
    res.json(key);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Renew any API key
router.patch('/:id/renew', async (req, res) => {
  try {
    const key = await apiKeyService.renewKey(
      req.params.id,
      req.body.durationMonths,
    );
    res.json(key);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
