const jwt = require('jsonwebtoken');
const User = require('../models/user.models');
const { validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Generate OTP
const generateOTP = () => {
  return speakeasy.totp({
    secret: speakeasy.generateSecret().base32,
    digits: 6,
    step: 300 // 5 minutes expiry
  });
};

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: 'Your OTP for Verification',
    text: `Your OTP is: ${otp}. It will expire in 5 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

// Register with Email OTP verification and resend capability
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array()
      });
    }

    const { fullname, email, phone, password, confirmPassword, role, resend } = req.body;
    
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if this is a resend request for an existing unverified user
    if (resend) {
      const existingUnverifiedUser = await User.findOne({ 
        email,
        isVerified: false 
      });

      if (!existingUnverifiedUser) {
        return res.status(404).json({
          success: false,
          message: 'No unverified user found with this email'
        });
      }

      // Generate new OTP
      let newOTP;
      do {
        newOTP = generateOTP();
      } while (newOTP === existingUnverifiedUser.otp);

      const otpExpiry = new Date(Date.now() + 300000); // 5 minutes

      // Update user with new OTP
      existingUnverifiedUser.otp = newOTP;
      existingUnverifiedUser.otpExpiry = otpExpiry;
      await existingUnverifiedUser.save();

      // Send new OTP
      await sendEmailOTP(email, newOTP);

      return res.status(200).json({
        success: true,
        message: 'New OTP sent to your email',
        email
      });
    }

    // Check existing user (for new registration)
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Phone already in use'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 300000); // 5 minutes

    // Create user in DB with isVerified: false, otp, and otpExpiry
    const user = new User({
      fullname,
      email,
      phone,
      password,
      role,
      isVerified: false,
      otp,
      otpExpiry
    });
    await user.save();

    // Send OTP via Email
    await sendEmailOTP(email, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      email
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Verify OTP and complete registration
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiry) {
      return res.status(401).json({
        success: false,
        message: 'OTP expired. Please request a new one.',
        isExpired: true
      });
    }

    // Verify OTP
    if (otp !== user.otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update user as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token
    });

  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
};

// Resend OTP for verification
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email, isVerified: false });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already verified'
      });
    }

    // Generate new OTP (different from previous one)
    let newOTP;
    do {
      newOTP = generateOTP();
    } while (newOTP === user.otp); // Ensure new OTP is different

    const otpExpiry = new Date(Date.now() + 300000); // 5 minutes

    // Update user with new OTP
    user.otp = newOTP;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send new OTP
    await sendEmailOTP(email, newOTP);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
      email
    });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP'
    });
  }
};

// Login (no OTP, just JWT)
exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: 'Login credentials and password are required'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: login },
        { fullname: login },
        { phone: login }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Only allow login if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.'
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Request password reset (send OTP)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 300000); // 5 minutes

    // Save OTP to user
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpiry;
    await user.save();

    // Send OTP via Email
    await sendEmailOTP(email, otp);

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email',
      email
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

// Verify OTP for password reset
exports.verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    if (otp !== user.resetPasswordOTP || new Date() > user.resetPasswordExpires) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Clear the OTP fields
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (err) {
    console.error('Reset OTP verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
};

// Resend Password Reset OTP
exports.resendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Generate new OTP (different from previous one)
    let newOTP;
    do {
      newOTP = generateOTP();
    } while (newOTP === user.resetPasswordOTP); // Ensure new OTP is different

    const otpExpiry = new Date(Date.now() + 300000); // 5 minutes

    // Update user with new OTP
    user.resetPasswordOTP = newOTP;
    user.resetPasswordExpires = otpExpiry;
    await user.save();

    // Send new OTP
    await sendEmailOTP(email, newOTP);

    res.status(200).json({
      success: true,
      message: 'New password reset OTP sent to your email',
      email
    });

  } catch (err) {
    console.error('Resend password reset OTP error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while resending password reset OTP'
    });
  }
};

// Reset password with new password (no reset token, use email and OTP)
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and passwords are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    if (otp !== user.resetPasswordOTP || new Date() > user.resetPasswordExpires) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};