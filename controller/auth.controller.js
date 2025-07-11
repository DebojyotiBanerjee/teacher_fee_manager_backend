const jwt = require('jsonwebtoken');
const User = require('../models/user.models');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Token expiry settings from environment variables
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.ACCESS_TOKEN_EXPIRY_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days default
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.REFRESH_TOKEN_EXPIRY_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days default

// Convert milliseconds to seconds for JWT
const ACCESS_TOKEN_EXPIRY_SECONDS = Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000);
const REFRESH_TOKEN_EXPIRY_SECONDS = Math.floor(REFRESH_TOKEN_EXPIRY_MS / 1000);

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
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: 'Your OTP for Verification',
    text: `Your OTP is: ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minute(s).`
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
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { fullname, email, phone, password, confirmPassword, role, resend } = req.body;

    // Validate role
    const validRoles = ['student', 'teacher']; // Define valid roles here
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }



    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (resend) {
      const existingUnverifiedUser = await User.findOne({ email, isVerified: false });
      if (!existingUnverifiedUser) {
        return res.status(404).json({
          success: false,
          message: 'No unverified user found with this email'
        });
      }
      let newOTP;
      do {
        newOTP = generateOTP();
      } while (newOTP === existingUnverifiedUser.otp);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES + 5 * 60 * 1000);
      existingUnverifiedUser.otp = newOTP;
      existingUnverifiedUser.otpExpiry = otpExpiry;
      await existingUnverifiedUser.save();
      await sendEmailOTP(email, newOTP);
      return res.status(200).json({
        success: true,
        message: 'New OTP sent to your email',
        data: { email }
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Phone already in use'
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES + 5 * 60 * 1000);

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
    await sendEmailOTP(email, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      data: { email }
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(401).json({
        success: false,
        message: 'OTP expired. Please request a new one.',
        data: { isExpired: true }
      });
    }
    if (otp !== user.otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    
    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS });
    
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: ACCESS_TOKEN_EXPIRY_MS
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: REFRESH_TOKEN_EXPIRY_MS
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {          
          fullname: user.fullname,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
        isAuthenticated: true,
        tokens: {
          accessToken,
          refreshToken
        }
      }
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

    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already verified'
      });
    }
    let newOTP;
    do {
      newOTP = generateOTP();
    } while (newOTP === user.otp);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES + 5 * 60 * 1000);
    user.otp = newOTP;
    user.otpExpiry = otpExpiry;
    await user.save();
    await sendEmailOTP(email, newOTP);
    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
      data: { email }
    });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP'
    });
  }
};

// Login (with OTP, just JWT)
exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: login }
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
    if (!user.isVerified) {
      // Generate and send new OTP
      let newOTP;
      do {
        newOTP = generateOTP();
      } while (newOTP === user.otp);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES + 5 * 60 * 1000);
      user.otp = newOTP;
      user.otpExpiry = otpExpiry;
      await user.save();
      await sendEmailOTP(user.email, newOTP);

      return res.status(200).json({
        success: false,
        message: 'Email is not verified. A new OTP has been sent to your email. Please verify to continue.',
        data: { email: user.email }
      });
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS });
    
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: ACCESS_TOKEN_EXPIRY_MS
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: REFRESH_TOKEN_EXPIRY_MS
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          role: user.role,
          isVerified: user.isVerified,
        },
        isAuthenticated: true,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Logout function to clear cookies
exports.logout = async (req, res) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: {
        isAuthenticated: false,
        user: null,
        tokens: null
      }
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      data: {
        isAuthenticated: false,
        user: null,
        tokens: null
      }
    });
  }
};

// Request password reset (send OTP)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES + 5 * 60 * 1000);
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpiry;
    await user.save();
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (otp !== user.resetPasswordOTP || new Date() > user.resetPasswordExpires) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }
    let newOTP;
    do {
      newOTP = generateOTP();
    } while (newOTP === user.resetPasswordOTP);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES + 5 * 60 * 1000);
    user.resetPasswordOTP = newOTP;
    user.resetPasswordExpires = otpExpiry;
    await user.save();
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

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (otp !== user.resetPasswordOTP || new Date() > user.resetPasswordExpires) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
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

// Get current authenticated user
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }
    const { fullname, email, role, isVerified } = req.user;
    res.status(200).json({
      success: true,
      message: 'User authenticated',
      data: {
        user: { fullname, email, role, isVerified },
        isAuthenticated: true
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user info'
    });
  }
};

// Refresh access and refresh tokens
exports.refreshToken = async (req, res) => {
  try {
    let refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      // Fallback to Authorization header
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.split(' ')[1];
      }
    }
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    // Issue new tokens using the same payload from the valid refresh token
    const newAccessToken = jwt.sign({ id: decoded.id, role: decoded.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS });
    const newRefreshToken = jwt.sign({ id: decoded.id, role: decoded.role }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS });
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: ACCESS_TOKEN_EXPIRY_MS
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: REFRESH_TOKEN_EXPIRY_MS
    });
    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
};