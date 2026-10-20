const mongoose = require('mongoose');
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 70 },
  description: { type: String, default: '', maxlength: 300 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
module.exports = mongoose.model('Group', groupSchema);
