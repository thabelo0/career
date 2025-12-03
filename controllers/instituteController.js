import Institute from '../models/Institute.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import { validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

const instituteController = {
  // Get all institutes (public)
  getAllInstitutes: async (req, res) => {
    try {
      const institutes = await Institute.getAll();
      
      res.json({
        success: true,
        data: institutes
      });

    } catch (error) {
      console.error('Get institutes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch institutes'
      });
    }
  },

  // Get institute by ID (public)
  getInstituteById: async (req, res) => {
    try {
      const { id } = req.params;
      const institute = await Institute.findById(id);

      if (!institute) {
        return res.status(404).json({
          success: false,
          message: 'Institute not found'
        });
      }

      res.json({
        success: true,
        data: institute
      });

    } catch (error) {
      console.error('Get institute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch institute'
      });
    }
  },

  // Get institute faculties (public)
  getInstituteFaculties: async (req, res) => {
    try {
      const { id } = req.params;
      const faculties = await Institute.getFaculties(id);

      res.json({
        success: true,
        data: faculties
      });

    } catch (error) {
      console.error('Get faculties error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch faculties'
      });
    }
  },

  // Get institute courses (public)
  getInstituteCourses: async (req, res) => {
    try {
      const { id } = req.params;
      const courses = await Institute.getCourses(id);

      res.json({
        success: true,
        data: courses
      });

    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses'
      });
    }
  },

  // Update institute profile
  updateInstituteProfile: async (req, res) => {
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
      const updated = await Institute.updateProfile(userId, req.body);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update profile'
        });
      }

      // Get updated profile
      const profile = await Institute.findByUserId(userId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });

    } catch (error) {
      console.error('Update institute profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  },

  // Create institute (Admin only)
  createInstitute: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, email, password, ...instituteData } = req.body;

      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create user and institute in transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [userResult] = await connection.execute(
          'INSERT INTO users (name, email, password, user_type, is_verified) VALUES (?, ?, ?, "institute", TRUE)',
          [name, email, hashedPassword]
        );

        const userId = userResult.insertId;

        // Create institute profile
        const [instituteResult] = await connection.execute(
          'INSERT INTO institutes (user_id, name, description, location, contact_email, contact_phone, website, established_year, accreditation, total_students, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            name,
            instituteData.description,
            instituteData.location,
            instituteData.contact_email,
            instituteData.contact_phone,
            instituteData.website,
            instituteData.established_year,
            instituteData.accreditation,
            instituteData.total_students,
            instituteData.address
          ]
        );

        await connection.commit();

        res.status(201).json({
          success: true,
          message: 'Institute created successfully',
          data: {
            id: instituteResult.insertId,
            name,
            email
          }
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Create institute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create institute'
      });
    }
  },

  // Delete institute (Admin only)
  deleteInstitute: async (req, res) => {
    try {
      const { id } = req.params;

      const [result] = await pool.execute(
        'DELETE FROM institutes WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Institute not found'
        });
      }

      res.json({
        success: true,
        message: 'Institute deleted successfully'
      });

    } catch (error) {
      console.error('Delete institute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete institute'
      });
    }
  }
};

export default instituteController;