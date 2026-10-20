const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();
const publicUser = u => ({ id: u._id, fullName: u.fullName, email: u.email, avatarUrl: u.avatarUrl });

router.post('/register', async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (fullName.length < 2 || fullName.length > 60) return res.status(400).json({ error: 'Name must be 2–60 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'An account with that email already exists.' });
    const user = await User.create({ fullName, email, passwordHash: await bcrypt.hash(password, 12) });
    setToken(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' }); next(e); }
});
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password.' });
    setToken(res, user); res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
});
router.post('/logout', (req, res) => { res.clearCookie('token', cookieOptions()); res.json({ ok: true }); });
router.get('/me', auth, async (req, res, next) => { try { const u = await User.findById(req.user.id); if (!u) return res.status(401).json({ error: 'Account not found.' }); res.json({ user: publicUser(u) }); } catch (e) { next(e); } });
function cookieOptions() { return { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' }; }
function setToken(res, user) { const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' }); res.cookie('token', token, cookieOptions()); }
module.exports = router;
