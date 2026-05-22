const express = require('express');
const router = express.Router();
const { userServices } = require('./user.service');

router.post('/report', async (req, res) => {
  try {
    const result = await userServices.report(req.body);
    res.status(result.status).json({ message: result.message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
