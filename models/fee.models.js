const mongoose = require('mongoose');
const { Schema } = mongoose;

const feeSchema = new Schema({
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
    unique: true // Ensure one QR per teacher
  },
  qrCodeUrl: {
    type: String,
    required: true
  },
  qrUploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fee', feeSchema);
