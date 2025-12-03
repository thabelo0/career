import Student from '../models/Student.js';
import { validationResult } from 'express-validator';

const studentController = {
  // Get student profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await Student.findByUserId(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      // Parse grades from JSON string
      if (profile.grades) {
        profile.grades = JSON.parse(profile.grades);
      }

      res.json({
        success: true,
        data: profile
      });

    } catch (error) {
      console.error('Get student profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student profile'
      });
    }
  },

  // Update student profile
  updateProfile: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const updated = await Student.updateProfile(userId, req.body);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update profile'
        });
      }

      // Get updated profile
      const profile = await Student.findByUserId(userId);
      if (profile.grades) {
        profile.grades = JSON.parse(profile.grades);
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });

    } catch (error) {
      console.error('Update student profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
};

export default studentController;