const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' })); app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users/search', require('./middleware/auth'), async (req, res, next) => { try { const User = require('./models/User'); const q = String(req.query.q || '').trim(); if (q.length < 2) return res.json({ users: [] }); const users = await User.find({ $or: [{ fullName: { $regex: escapeRegex(q), $options: 'i' } }, { email: { $regex: escapeRegex(q), $options: 'i' } }], _id: { $ne: req.user.id } }).select('fullName email').limit(10).lean(); res.json({ users: users.map(u => ({ id: u._id, fullName: u.fullName, email: u.email })) }); } catch (e) { next(e); } });
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'An unexpected server error occurred.' }); });
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = app;
