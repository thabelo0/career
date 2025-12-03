import Course from '../models/Course.js';
import Faculty from '../models/Faculty.js';
import { validationResult } from 'express-validator';
import { pool } from '../config/database.js';

const courseController = {
  // Create course - FIXED: Remove user authentication
  createCourse: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { faculty_id, ...courseData } = req.body;

      // Validate required fields
      if (!faculty_id) {
        return res.status(400).json({
          success: false,
          message: 'Faculty ID is required'
        });
      }

      // Verify faculty exists
      const faculty = await Faculty.findById(faculty_id);
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: 'Faculty not found'
        });
      }

      const courseId = await Course.create({
        faculty_id,
        ...courseData
      });

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: {
          id: courseId
        }
      });

    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create course'
      });
    }
  },

  // Update course - FIXED: Remove user authentication
  updateCourse: async (req, res) => {
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

      // FIXED: Remove institute verification
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const updated = await Course.update(id, req.body);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update course'
        });
      }

      res.json({
        success: true,
        message: 'Course updated successfully'
      });

    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update course'
      });
    }
  },

  // Delete course (soft delete) - FIXED: Remove user authentication
  deleteCourse: async (req, res) => {
    try {
      const { id } = req.params;

      // FIXED: Remove institute verification
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if course has pending applications
      const [applications] = await pool.execute(
        'SELECT COUNT(*) as count FROM applications WHERE course_id = ? AND status IN ("pending", "under_review")',
        [id]
      );

      if (applications[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete course with pending applications. Please process all applications first.'
        });
      }

      const deleted = await Course.delete(id);

      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Failed to delete course'
        });
      }

      res.json({
        success: true,
        message: 'Course deleted successfully'
      });

    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete course'
      });
    }
  },

  // In courseController.js - Add this method if not exists
getCourse: async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    });
  }
},

  // Check course eligibility
  checkEligibility: async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req.user.profile.id;

      // Get student grades
      const [students] = await pool.execute(
        'SELECT grades FROM students WHERE id = ?',
        [studentId]
      );

      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      const studentGrades = JSON.parse(students[0].grades || '{}');
      const eligibility = await Course.checkEligibility(courseId, studentGrades);

      res.json({
        success: true,
        data: eligibility
      });

    } catch (error) {
      console.error('Check eligibility error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check eligibility'
      });
    }
  }
};

export default courseController;