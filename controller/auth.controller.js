const jwt = require('jsonwebtoken');
const User = require('../models/user.models');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { tokenUtils } = require('../utils/controllerUtils');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Token expiry settings from environment variables
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.ACCESS_TOKEN_EXPIRY_MS) || 30 * 60 * 1000; // 30 minutes default
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.REFRESH_TOKEN_EXPIRY_MS) || 30 * 24 * 60 * 60 * 1000; // 30 days default

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
  // Generate a 6-digit OTP with better randomness
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: 'Your OTP for Verification',
      text: `Your OTP is: ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minute(s).`
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send OTP email');
  }
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

    // Normalize resend parameter - only treat as true if explicitly set to true
    // Check if resend is explicitly set to true (not just any truthy value)
    const isResendRequest = resend === true || resend === 'true' || resend === 1 || resend === '1';
    
    // If resend is not explicitly set to true, treat as new registration
    const isNewRegistration = !isResendRequest;
    
    // Debug logging
    console.log('Registration request:', {
      email,
      resend: resend,
      isResendRequest,
      hasAllFields: !!(fullname && email && phone && password && confirmPassword && role)
    });

    // Validate required fields
    if (!fullname || !email || !phone || !password || !confirmPassword || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate role
    const validRoles = ['student', 'teacher']; // Define valid roles here
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }



    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    let existingUser;
    try {
      existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database error during registration'
      });
    }
    
    // Debug logging
    console.log('User lookup result:', {
      email,
      existingUser: existingUser ? { id: existingUser._id, isVerified: existingUser.isVerified } : null,
      isResendRequest
    });
    
    // If user exists and resend is requested, handle resend OTP
    if (existingUser && isResendRequest) {
      // Check if the existing user is unverified
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'User is already verified'
        });
      }
      
      let newOTP;
      do {
        newOTP = generateOTP();
      } while (newOTP === existingUser.otp);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
      existingUser.otp = newOTP;
      existingUser.otpExpiry = otpExpiry;
      await existingUser.save();
      await sendEmailOTP(email, newOTP);
      return res.status(200).json({
        success: true,
        message: 'New OTP sent to your email',
        data: { email }
      });
    }
    
    // If user exists but no resend requested, return conflict
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Phone already in use'
      });
    }
    
    // If resend is requested but no user exists, return error
    if (isResendRequest) {
      return res.status(404).json({
        success: false,
        message: 'No unverified user found with this email'
      });
    }
    
    // If this is a new registration (no resend requested), proceed with registration
    if (isNewRegistration) {
      console.log('Proceeding with new user registration for:', email);
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    console.log('Creating new user with:', {
      email,
      role,
      otp: otp.substring(0, 3) + '***' // Log partial OTP for debugging
    });

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
    
    try {
      await user.save();
      console.log('User saved successfully:', user._id);
    } catch (saveError) {
      console.error('Error saving user:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Error creating user account'
      });
    }
    
    try {
      await sendEmailOTP(email, otp);
      console.log('OTP email sent successfully to:', email);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      // Don't fail the registration if email fails, but log it
    }

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

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this user'
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
      maxAge: ACCESS_TOKEN_EXPIRY_MS,
      path: '/'
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: REFRESH_TOKEN_EXPIRY_MS,
      path: '/'
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

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

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
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
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

    // Validate input
    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Validate email format if login is an email
    if (login.includes('@') && !isValidEmail(login)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

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

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Always generate and send new OTP if user is authenticated but not verified
    let otpSent = false;
    if (!user.isVerified) {
      let newOTP;
      do {
        newOTP = generateOTP();
      } while (newOTP === user.otp);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
      user.otp = newOTP;
      user.otpExpiry = otpExpiry;
      await user.save();
      await sendEmailOTP(user.email, newOTP);
      otpSent = true;
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS });
    
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: ACCESS_TOKEN_EXPIRY_MS,
      path: '/'
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: REFRESH_TOKEN_EXPIRY_MS,
      path: '/'
    });

    // If user is not verified, inform client that OTP was sent and require verification
    if (!user.isVerified) {
      return res.status(200).json({
        success: false,
        message: 'Email is not verified. A new OTP has been sent to your email. Please verify to continue.',
        data: {
          email: user.email,
          isAuthenticated: true,
          isVerified: false
        }
      });
    }

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

// Logout function to clear cookies and blacklist tokens
exports.logout = async (req, res) => {
  try {
    // Get tokens from cookies or headers
    let accessToken = req.cookies.accessToken;
    let refreshToken = req.cookies.refreshToken;
    
    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.split(' ')[1];
      }
    }

    // Blacklist the tokens if they exist
    if (accessToken) {
      try {
        tokenUtils.blacklistToken(accessToken);
      } catch (error) {
        console.error('Error blacklisting access token:', error);
      }
    }
    if (refreshToken) {
      try {
        tokenUtils.blacklistToken(refreshToken);
      } catch (error) {
        console.error('Error blacklisting refresh token:', error);
      }
    }

    // Clear cookies
    res.clearCookie("accessToken", { path: '/' });
    res.clearCookie("refreshToken", { path: '/' });

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

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
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

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if reset OTP exists
    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: 'No password reset OTP found for this user'
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

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    let newOTP;
    do {
      newOTP = generateOTP();
    } while (newOTP === user.resetPasswordOTP);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
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

    // Validate input
    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password strength (basic validation)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if reset OTP exists
    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: 'No password reset OTP found for this user'
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

    // Fetch fresh user data from database
    const user = await User.findById(req.user.id).select('fullname email role isVerified phone isActive');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }

    // Check if user is still active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }

    const { fullname, email, role, isVerified, phone } = user;
    res.status(200).json({
      success: true,
      message: 'User authenticated',
      data: {
        user: { fullname, email, role, isVerified, phone },
        isAuthenticated: true
      }
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user info'
    });
  }
};

