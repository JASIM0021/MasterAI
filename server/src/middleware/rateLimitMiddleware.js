// middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');

async function keyRateLimiter(opts = {}) {
  return async (req, res, next) => {
    if (!req.apiKey) return next();

    const limiter = rateLimit({
      windowMs: opts.windowMs || 15 * 60 * 1000, // 15 minutes
      max: opts.max || 100,
      keyGenerator: () => req.apiKey.key,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests, please try again later',
        });
      },
    });

    return limiter(req, res, next);
  };
}

module.exports = keyRateLimiter;
