import Faculty from '../models/Faculty.js';
import { validationResult } from 'express-validator';
import { pool } from '../config/database.js';

const facultyController = {
  // Create faculty - FIXED: Remove user authentication
  createFaculty: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // FIXED: Get institute_id directly from request body instead of user profile
      const { institute_id, name, description, dean_name, contact_email, contact_phone, established_year } = req.body;

      // Validate required fields
      if (!institute_id) {
        return res.status(400).json({
          success: false,
          message: 'Institute ID is required'
        });
      }

      // Verify institute exists
      const [institutes] = await pool.execute(
        'SELECT id FROM institutes WHERE id = ?',
        [institute_id]
      );

      if (institutes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Institute not found'
        });
      }

      const facultyData = {
        institute_id,
        name,
        description,
        dean_name,
        contact_email,
        contact_phone,
        established_year
      };

      const facultyId = await Faculty.create(facultyData);

      res.status(201).json({
        success: true,
        message: 'Faculty created successfully',
        data: {
          id: facultyId
        }
      });

    } catch (error) {
      console.error('Create faculty error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create faculty'
      });
    }
  },

  // Update faculty - FIXED: Remove user authentication
  updateFaculty: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;

      // FIXED: Remove institute verification since we don't have user context
      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      const updated = await Faculty.update(id, req.body);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update faculty'
        });
      }

      res.json({
        success: true,
        message: 'Faculty updated successfully'
      });

    } catch (error) {
      console.error('Update faculty error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update faculty'
      });
    }
  },

  // Delete faculty - FIXED: Remove user authentication
  deleteFaculty: async (req, res) => {
    try {
      const { id } = req.params;

      // FIXED: Remove institute verification
      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      // Check if faculty has courses
      const courses = await Faculty.getCourses(id);
      if (courses.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete faculty with existing courses. Please delete or transfer courses first.'
        });
      }

      const deleted = await Faculty.delete(id);

      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete faculty'
        });
      }

      res.json({
        success: true,
        message: 'Faculty deleted successfully'
      });

    } catch (error) {
      console.error('Delete faculty error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete faculty'
      });
    }
  }
};

export default facultyController;