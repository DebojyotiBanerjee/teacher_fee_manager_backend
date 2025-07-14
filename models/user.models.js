const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    },
    password: {
      type: String,
      required: true,
      match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      select: false
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline"
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    otp: {
      type: String
    },
    otpExpiry: {
      type: Date
    },
    resetPasswordOTP: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);