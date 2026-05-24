const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    content: { type: String, required: true },
    editedBy: { type: String, required: true },
    delta: { type: String },
  },
  { timestamps: true }
);

// Compound index — fast lookup by doc + version
VersionSchema.index({ docId: 1, version: -1 });

module.exports = mongoose.model('Version', VersionSchema);