const isAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.headers['adminkey'];
  if (adminKey && adminKey === process.env.MASTER_AI_API_KEY) {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};

module.exports = isAdmin;
