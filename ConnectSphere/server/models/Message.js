const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true, trim: true, maxlength: 3000 },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });
messageSchema.index({ groupId: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);
