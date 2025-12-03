import { pool } from '../config/database.js';
import { validationResult } from 'express-validator';

const adminController = {
  // Get system statistics
  getSystemStats: async (req, res) => {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE user_type = 'student' AND is_verified = TRUE) as total_students,
          (SELECT COUNT(*) FROM users WHERE user_type = 'institute' AND is_verified = TRUE) as total_institutes,
          (SELECT COUNT(*) FROM applications) as total_applications,
          (SELECT COUNT(*) FROM admission_periods WHERE status = 'active') as active_admissions,
          (SELECT COUNT(*) FROM applications WHERE status = 'pending') as pending_applications,
          (SELECT COUNT(*) FROM applications WHERE status = 'accepted') as accepted_applications,
          (SELECT COUNT(*) FROM courses WHERE is_active = TRUE) as active_courses
      `);

      const [recentActivities] = await pool.execute(`
        (SELECT 'application' as type, a.application_date as date, u.name as user_name, c.name as course_name
         FROM applications a
         JOIN students s ON a.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN courses c ON a.course_id = c.id
         ORDER BY a.application_date DESC LIMIT 5)
        UNION ALL
        (SELECT 'registration' as type, u.created_at as date, u.name as user_name, u.user_type as course_name
         FROM users u
         WHERE u.is_verified = TRUE
         ORDER BY u.created_at DESC LIMIT 5)
        ORDER BY date DESC LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          statistics: stats[0],
          recentActivities
        }
      });

    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system statistics'
      });
    }
  },

  // Get all users with filtering
  getUsers: async (req, res) => {
    try {
      const { type, page = 1, limit = 10, search } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT u.id, u.name, u.email, u.user_type, u.is_verified, u.created_at
        FROM users u
        WHERE 1=1
      `;
      const params = [];

      if (type) {
        query += ' AND u.user_type = ?';
        params.push(type);
      }

      if (search) {
        query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [users] = await pool.execute(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
      const countParams = [];

      if (type) {
        countQuery += ' AND u.user_type = ?';
        countParams.push(type);
      }

      if (search) {
        countQuery += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  },

  // Manage user verification
  manageUserVerification: async (req, res) => {
    try {
      const { userId } = req.params;
      const { action } = req.body; // 'verify' or 'reject'

      if (!['verify', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
      }

      const [result] = await pool.execute(
        'UPDATE users SET is_verified = ? WHERE id = ?',
        [action === 'verify', userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: `User ${action === 'verify' ? 'verified' : 'rejected'} successfully`
      });

    } catch (error) {
      console.error('Manage user verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to manage user verification'
      });
    }
  },

  // Get all applications (admin view)
  getAllApplications: async (req, res) => {
    try {
      const { status, instituteId, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          a.*,
          u.name as student_name,
          u.email as student_email,
          c.name as course_name,
          i.name as institute_name,
          ap.name as admission_period
        FROM applications a
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON a.course_id = c.id
        JOIN institutes i ON a.institute_id = i.id
        LEFT JOIN admission_periods ap ON a.admission_period_id = ap.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }

      if (instituteId) {
        query += ' AND a.institute_id = ?';
        params.push(instituteId);
      }

      query += ' ORDER BY a.application_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [applications] = await pool.execute(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM applications a
        WHERE 1=1
      `;
      const countParams = [];

      if (status) {
        countQuery += ' AND a.status = ?';
        countParams.push(status);
      }

      if (instituteId) {
        countQuery += ' AND a.institute_id = ?';
        countParams.push(instituteId);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get all applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications'
      });
    }
  }
};

export default adminController;