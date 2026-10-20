const jwt = require('jsonwebtoken');
module.exports = function auth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.clearCookie('token'); return res.status(401).json({ error: 'Your session expired. Please log in again.' }); }
};
