import User from '../models/User.js';
import Student from '../models/Student.js';
import Institute from '../models/Institute.js';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, email, password, userType } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create user (auto-verified)
      const user = await User.create({
        name,
        email,
        password,
        user_type: userType
      });

      // Create user profile based on type
      if (userType === 'student') {
        await Student.createProfile(user.id);
      } else if (userType === 'institute') {
        await Institute.createProfile(user.id, name);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful! You can now login.',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.user_type
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  },

  // Login user - WITHOUT TOKEN (SINGLE METHOD - NO DUPLICATE)
  login: async (req, res) => {
    try {
      console.log('🔐 Login attempt for:', req.body.email);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, userType } = req.body;

      // Find user
      console.log('🔍 Finding user by email:', email);
      const user = await User.findByEmail(email);
      
      if (!user) {
        console.log('❌ User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      console.log('✅ User found:', user.id, user.name);

      // Check user type
      if (user.user_type !== userType) {
        console.log('❌ User type mismatch:', user.user_type, '!=', userType);
        return res.status(401).json({
          success: false,
          message: `Invalid user type. This email is registered as ${user.user_type}`
        });
      }

      // Check password
      console.log('🔑 Checking password...');
      const isPasswordValid = await User.comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      console.log('✅ Password valid');

      // Get user profile based on type
      let profile = null;
      if (userType === 'student') {
        console.log('📚 Getting student profile...');
        profile = await Student.findByUserId(user.id);
      } else if (userType === 'institute') {
        console.log('🏫 Getting institute profile...');
        profile = await Institute.findByUserId(user.id);
      }
      console.log('✅ Profile found:', profile ? 'Yes' : 'No');

      console.log('🎉 Login successful for user:', user.id);
      
      // Return success WITHOUT token
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            profile: profile
          }
          // REMOVED: token field
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  },

  // Get current user
  getMe: async (req, res) => {
    try {
      let profile = null;
      
      if (req.user.user_type === 'student') {
        profile = await Student.findByUserId(req.user.id);
      } else if (req.user.user_type === 'institute') {
        profile = await Institute.findByUserId(req.user.id);
      }

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            userType: req.user.user_type,
            profile: profile
          }
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user data'
      });
    }
  },

  // Request password reset
  requestPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Save reset token to database
      await User.updateResetToken(user.id, resetToken);

      res.json({
        success: true,
        message: 'Password reset instructions sent to your email'
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }
};

export default authController;