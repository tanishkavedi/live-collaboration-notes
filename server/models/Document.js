const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, default: 'Untitled' },
    content: { type: String, default: '' },
    version: { type: Number, default: 0 },
    activeUsers: [{ type: String }],
    lastEditedBy: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);