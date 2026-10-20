const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
module.exports = function configureChat(io) {
  io.use((socket, next) => { try { const token = socket.handshake.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('token='))?.slice(6); if (!token) return next(new Error('Authentication required')); socket.user = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET); next(); } catch { next(new Error('Authentication required')); } });
  const online = new Map();
  io.on('connection', async socket => {
    const user = await User.findById(socket.user.id).select('fullName').catch(() => null); if (!user) return socket.disconnect(true);
    online.set(String(socket.user.id), (online.get(String(socket.user.id)) || 0) + 1);
    socket.join(`user:${socket.user.id}`);
    io.emit('presence', { userId: String(socket.user.id), online: true });
    socket.on('join_group', async (groupId, ack = () => {}) => { try { const g = await Group.findById(groupId); if (!g || !g.members.some(m => m.toString() === socket.user.id)) return ack({ error: 'Group access denied.' }); socket.join(`group:${groupId}`); ack({ ok: true }); } catch { ack({ error: 'Unable to join group.' }); } });
    socket.on('leave_group', groupId => socket.leave(`group:${groupId}`));
    socket.on('send_message', async (payload, ack = () => {}) => { try { const groupId = String(payload?.groupId || ''); const content = String(payload?.content || '').trim(); if (!content || content.length > 3000) return ack({ error: 'Message must contain 1–3000 characters.' }); const g = await Group.findById(groupId); if (!g || !g.members.some(m => m.toString() === socket.user.id)) return ack({ error: 'Group access denied.' }); const message = await Message.create({ groupId: g._id, senderId: socket.user.id, senderName: user.fullName, content }); const data = { id: String(message._id), groupId, senderId: String(socket.user.id), senderName: user.fullName, content: message.content, createdAt: message.createdAt }; io.to(`group:${groupId}`).emit('new_message', data); ack({ ok: true, message: data }); } catch { ack({ error: 'Message could not be saved. Please retry.' }); } });
    socket.on('typing_start', async groupId => { const g = await Group.findById(groupId).catch(() => null); if (g?.members.some(m => m.toString() === socket.user.id)) socket.to(`group:${groupId}`).emit('typing', { groupId, userId: String(socket.user.id), name: user.fullName, typing: true }); });
    socket.on('typing_stop', groupId => socket.to(`group:${groupId}`).emit('typing', { groupId, userId: String(socket.user.id), name: user.fullName, typing: false }));
    socket.on('disconnect', () => { const id = String(socket.user.id), count = (online.get(id) || 1) - 1; if (count <= 0) { online.delete(id); io.emit('presence', { userId: id, online: false }); } else online.set(id, count); });
  });
};
